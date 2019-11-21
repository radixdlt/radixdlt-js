import { Subject, Observable, Observer, BehaviorSubject } from 'rxjs'
import { TSMap } from 'typescript-map'

import RadixAccountSystem from './RadixAccountSystem'
import RadixTransaction from './RadixTransaction'
import RadixTransactionUpdate from './RadixTransactionUpdate'

import {
    RadixAtomUpdate,
    RadixAddress,
    RadixSpin,
    RadixTransferrableTokensParticle,
    RadixConsumable,
    RadixUniqueParticle,
    RadixParticleGroup,
    RadixAtom,
} from '../atommodel'
import { RadixDecryptionState } from './RadixDecryptionAccountSystem';

import BN from 'bn.js'
import { radixTokenManager } from '../token/RadixTokenManager';
import Decimal from 'decimal.js';
import { RadixTokenDefinition } from '../token/RadixTokenDefinition';
import { RadixAtomStatusIsInsert, RadixAtomObservation } from '../..';

enum AtomOperation {
    STORE,
    DELETE
}

export type TransferState = {
    spentConsumables: TSMap<string, RadixConsumable>,
    unspentConsumables: TSMap<string, RadixConsumable>,
    balance: { [tokenId: string]: BN },
    tokenUnitsBalance: { [tokenId: string]: Decimal }
}

export default class RadixTransferAccountSystem implements RadixAccountSystem {
    public name = 'TRANSFER'

    public readonly transactions: TSMap<string, RadixTransaction> = new TSMap()
    public readonly balance: { [tokenId: string]: BN } = {}
    public readonly tokenUnitsBalance: { [tokenId: string]: Decimal } = {}

    public transactionSubject: Subject<RadixTransactionUpdate> = new Subject()
    public balanceSubject: BehaviorSubject<{ [tokenId: string]: BN }>
    private tokenUnitsBalanceSubject: BehaviorSubject<{ [tokenId: string]: Decimal }>

    private unspentConsumables: TSMap<string, RadixConsumable> = new TSMap()
    private spentConsumables: TSMap<string, RadixConsumable> = new TSMap()

    constructor(readonly address: RadixAddress) {
        // Add default radix token to balance
        this.balance[radixTokenManager.nativeToken.toString()] = new BN(0)
        this.balanceSubject = new BehaviorSubject(this.balance)

        this.tokenUnitsBalance[radixTokenManager.nativeToken.toString()] = new Decimal(0)
        this.tokenUnitsBalanceSubject = new BehaviorSubject(this.tokenUnitsBalance)
    }

    private concatMaps(map1: TSMap<any, any>, map2: TSMap<any, any>): TSMap<any, any> {
        let newMap = map2.clone()
        map1.forEach((value, key) => {
            newMap.set(key, value)
        })
        return newMap
    }

    public static processParticleGroups(
        particleGroups: RadixParticleGroup[],
        atomOperation: AtomOperation,
        address: RadixAddress,
        state: TransferState
    ) {
        switch(atomOperation) {
            case AtomOperation.STORE:
                return RadixTransferAccountSystem.processStoreParticleGroups(particleGroups, address, state)
            case AtomOperation.DELETE:
                //RadixTransferAccountSystem.proc
        }
    }

    public static processStoreParticleGroups(
        particleGroups: RadixParticleGroup[],
        address: RadixAddress,
        state: TransferState
    ) {
        const spunParticles = RadixAtom.getSpunParticlesOfType(RadixAtom.getParticles(particleGroups), RadixTransferrableTokensParticle)
        let currentBalance: { [tokenId: string]: BN } = {}
        let currentParticipants = {}
        let currentTokenUnitsBalance: { [tokenId: string]: Decimal } = {}

        // Get transaction details
        for (const spunParticle of spunParticles) {
            const spin = spunParticle.spin
            const particle = spunParticle.particle as RadixConsumable
            const tokenClassReference = particle.getTokenDefinitionReference()

            const ownedByMe = particle.getOwner().equals(address)

            // TODO: Implement Fees when they change to token fees

            // Assumes POW fee
            if (ownedByMe) {
                const quantity = new BN(0)
                const hid = particle.getHidString()

                if (spin === RadixSpin.DOWN) {
                    quantity.isub(particle.getAmount())

                    state.unspentConsumables.delete(hid)
                    state.spentConsumables.set(hid, particle)
                } else if (spin === RadixSpin.UP) {
                    quantity.iadd(particle.getAmount())

                    if (!state.spentConsumables.has(hid)) {
                        state.unspentConsumables.set(hid, particle)
                    }
                }

                if (!(tokenClassReference.toString() in currentBalance)) {
                    currentBalance[tokenClassReference.toString()] = new BN(0)
                }
                currentBalance[tokenClassReference.toString()].iadd(quantity)
            } else {
                currentParticipants[particle.getOwner().toString()] = particle.getOwner()
            }
        }

        // Not a transfer
        if (Object.keys(currentBalance).length === 0) {
            return
        }


        const numberOfParticipants = Object.keys(currentParticipants).length
        if (numberOfParticipants > 2) {
            throw new Error(`Invalid number of transaction participants = ${numberOfParticipants}`)
        }

        // Update balance
        for (const tokenId in currentBalance) {
            if (!(tokenId in state.balance) || !state.balance[tokenId]) {
                state.balance[tokenId] = new BN(0)
            }

            state.balance[tokenId].iadd(currentBalance[tokenId])

            // Token units
            currentTokenUnitsBalance[tokenId] = RadixTokenDefinition.fromSubunitsToDecimal(currentBalance[tokenId])

            if (!(tokenId in state.tokenUnitsBalance) || !state.balance[tokenId]) {
                state.tokenUnitsBalance[tokenId] = new Decimal(0)
            }

            state.tokenUnitsBalance[tokenId] = state.tokenUnitsBalance[tokenId].add(currentTokenUnitsBalance[tokenId])
        }

        return {
            currentBalance,
            currentParticipants,
            currentTokenUnitsBalance
        }
    }
    public processAtomUpdate(atomUpdate: RadixAtomObservation) {
        const atom = atomUpdate.atom
        if (!atom.containsParticle(RadixTransferrableTokensParticle)) {
            return
        }

        if (RadixAtomStatusIsInsert[atomUpdate.status.status]) {
            this.processStoreAtom(atomUpdate)
        } else {
            this.processDeleteAtom(atomUpdate)
        }
    }

    private processStoreAtom(atomUpdate: RadixAtomObservation) {
        const atom = atomUpdate.atom


        // Skip existing atoms
        if (this.transactions.has(atom.getAidString())) {  // just to skip if we already processed this atom
            return
        }

        const transactionUpdate: RadixTransactionUpdate = {
            action: 'STORE',
            aid: atom.getAidString(),
            transaction: {
                aid: atom.getAidString(),
                balance: {},
                tokenUnitsBalance: {},
                fee: 0,
                participants: {},
                timestamp: atom.getTimestamp(),
                message: '',
                unique: atom.getParticlesOfType(RadixUniqueParticle).map(p => p.getRRI().toString()),
            },
        }

        const transaction = transactionUpdate.transaction

        // Get transaction message
        if (atomUpdate.processedData.decryptedData
            && atomUpdate.processedData.decryptedData.decryptionState !== RadixDecryptionState.CANNOT_DECRYPT) {
            transaction.message = atomUpdate.processedData.decryptedData.data
        }

        //const consumables = atom.getSpunParticlesOfType(RadixTransferrableTokensParticle)
        const state: TransferState = {
            spentConsumables: this.spentConsumables,
            unspentConsumables: this.unspentConsumables,
            balance: this.balance,
            tokenUnitsBalance: this.tokenUnitsBalance
        }

        const result = RadixTransferAccountSystem.processParticleGroups(
            atom.getParticleGroups(), 
            AtomOperation.STORE, 
            this.address,
            state
        )

        if(!result) {
            return
        }

        transaction.balance = result.currentBalance
        transaction.participants = result.currentParticipants
        transaction.tokenUnitsBalance = result.currentTokenUnitsBalance

        this.transactions.set(transactionUpdate.aid, transaction)

        this.balanceSubject.next(this.balance)
        this.tokenUnitsBalanceSubject.next(this.tokenUnitsBalance)
        this.transactionSubject.next(transactionUpdate)
    }

    private async processDeleteAtom(atomUpdate: RadixAtomObservation) {
        const atom = atomUpdate.atom

        // Skip nonexisting atoms
        if (!this.transactions.has(atom.getAidString())) {
            return
        }

        const id = atom.getAidString()
        const transaction = this.transactions.get(id)
        const transactionUpdate: RadixTransactionUpdate = {
            action: 'DELETE',
            aid: id,
            transaction,
        }

        const state: TransferState = {
            spentConsumables: this.spentConsumables,
            unspentConsumables: this.unspentConsumables,
            balance: this.balance,
            tokenUnitsBalance: this.tokenUnitsBalance
        }

        // Update balance
        for (const tokenId in transaction.balance) {
            // Load tokenclass from network
            // const tokenClass = await radixTokenManager.getTokenClass(tokenId)

            if (!(tokenId in state.balance) || !state.balance[tokenId]) {
                state.balance[tokenId] = new BN(0)
            }

            state.balance[tokenId].isub(transaction.balance[tokenId])

            // Token units
            transaction.tokenUnitsBalance[tokenId] = RadixTokenDefinition.fromSubunitsToDecimal(transaction.balance[tokenId])

            if (!(tokenId in state.tokenUnitsBalance) || !state.balance[tokenId]) {
                state.tokenUnitsBalance[tokenId] = new Decimal(0)
            }

            state.tokenUnitsBalance[tokenId] = state.tokenUnitsBalance[tokenId].sub(transaction.tokenUnitsBalance[tokenId])
        }

        this.transactions.delete(transactionUpdate.aid)

        this.balanceSubject.next(this.balance)
        this.tokenUnitsBalanceSubject.next(this.tokenUnitsBalance)
        this.transactionSubject.next(transactionUpdate)
    }

    public getAllTransactions(): Observable<RadixTransactionUpdate> {
        return Observable.create(
            (observer: Observer<RadixTransactionUpdate>) => {
                // Send all old transactions
                for (const transaction of this.transactions.values()) {
                    const transactionUpdate: RadixTransactionUpdate = {
                        action: 'STORE',
                        aid: transaction.aid,
                        transaction,
                    }

                    observer.next(transactionUpdate)
                }

                // Subscribe for new ones
                this.transactionSubject.subscribe(observer)
            }
        )
    }

    public getUnspentConsumables() {
        return this.unspentConsumables.values()
    }

    public getTokenUnitsBalanceUpdates() {
        return this.tokenUnitsBalanceSubject.share()
    }

    public getState(): TransferState {
        return {
            balance: { ...this.balance },
            tokenUnitsBalance: { ...this.tokenUnitsBalance },
            spentConsumables: this.spentConsumables.clone(),
            unspentConsumables: this.unspentConsumables.clone()
        }
    }
}
