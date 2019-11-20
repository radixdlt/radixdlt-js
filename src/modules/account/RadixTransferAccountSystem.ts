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

export default class RadixTransferAccountSystem implements RadixAccountSystem {
    public name = 'TRANSFER'

    public transactions: TSMap<string, RadixTransaction> = new TSMap()
    public balance: { [tokenId: string]: BN } = {}
    public tokenUnitsBalance: { [tokenId: string]: Decimal } = {}

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
        atomOperation: string,
        address: RadixAddress
    ) {
        let spentConsumables: TSMap<string, RadixConsumable> = new TSMap()
        let unspentConsumables: TSMap<string, RadixConsumable> = new TSMap()
        let transaction = {
            balance: {},
            participants: {},
            tokenUnitsBalance: {}
        }
        let balance: { [tokenId: string]: BN } = {} = {}
        let tokenUnitsBalance: { [tokenId: string]: Decimal } = {}
        const spunParticles = RadixAtom.getSpunParticlesOfType(RadixAtom.getParticles(particleGroups), RadixTransferrableTokensParticle)
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

                    unspentConsumables.delete(hid)
                    spentConsumables.set(hid, particle)
                } else if (spin === RadixSpin.UP) {
                    quantity.iadd(particle.getAmount())

                    if (!spentConsumables.has(hid)) {
                        unspentConsumables.set(hid, particle)
                    }
                }

                if (!(tokenClassReference.toString() in transaction.balance)) {
                    transaction.balance[tokenClassReference.toString()] = new BN(0)
                }
                transaction.balance[tokenClassReference.toString()].iadd(quantity)
            } else {
                transaction.participants[particle.getOwner().toString()] = particle.getOwner()
            }
        }

        // Not a transfer
        if (Object.keys(transaction.balance).length === 0) {
            return
        }


        const numberOfParticipants = Object.keys(transaction.participants).length
        if (numberOfParticipants > 2) {
            throw new Error(`Invalid number of transaction participants = ${numberOfParticipants}`)
        }

        // Update balance
        for (const tokenId in transaction.balance) {
            // Load tokenclass from network
            // const tokenClass = await radixTokenManager.getTokenClass(tokenId)

            if (!(tokenId in balance) || !balance[tokenId]) {
                balance[tokenId] = new BN(0)
            }

            balance[tokenId].iadd(transaction.balance[tokenId])

            // Token units
            transaction.tokenUnitsBalance[tokenId] = RadixTokenDefinition.fromSubunitsToDecimal(transaction.balance[tokenId])

            if (!(tokenId in tokenUnitsBalance) || !balance[tokenId]) {
                tokenUnitsBalance[tokenId] = new Decimal(0)
            }

            tokenUnitsBalance[tokenId] = tokenUnitsBalance[tokenId].add(transaction.tokenUnitsBalance[tokenId])
        }

        return {
            spentConsumables,
            unspentConsumables,
            transaction,
            balance,
            tokenUnitsBalance
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
        if (this.transactions.has(atom.getAidString())) {
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
        const result = RadixTransferAccountSystem.processParticleGroups(
            atom.getParticleGroups(), 
            '', 
            this.address
        )

        if(result) {
            this.spentConsumables = this.concatMaps(this.spentConsumables, result.spentConsumables)
            this.unspentConsumables = this.concatMaps(this.unspentConsumables, result.unspentConsumables)
            transaction.balance = result.transaction.balance
            transaction.participants = result.transaction.participants
            transaction.tokenUnitsBalance = result.transaction.tokenUnitsBalance
            
            for(let key in result.balance) {
                if(this.balance[key]) {
                    this.balance[key] = this.balance[key].add(result.balance[key])
                } else {
                    this.balance[key] = result.balance[key]
                }
            }

            for(let key in result.tokenUnitsBalance) {
                if(this.tokenUnitsBalance[key]) {
                    this.tokenUnitsBalance[key] = this.tokenUnitsBalance[key].add(result.tokenUnitsBalance[key])
                } else {
                    this.tokenUnitsBalance[key] = result.tokenUnitsBalance[key]
                }
            }
        }

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

        // Update balance
        for (const tokenId in transaction.balance) {
            // Load tokenclass from network
            // const tokenClass = await radixTokenManager.getTokenClass(tokenId)

            if (!(tokenId in this.balance) || !this.balance[tokenId]) {
                this.balance[tokenId] = new BN(0)
            }

            this.balance[tokenId].isub(transaction.balance[tokenId])

            // Token units
            transaction.tokenUnitsBalance[tokenId] = RadixTokenDefinition.fromSubunitsToDecimal(transaction.balance[tokenId])

            if (!(tokenId in this.tokenUnitsBalance) || !this.balance[tokenId]) {
                this.tokenUnitsBalance[tokenId] = new Decimal(0)
            }

            this.tokenUnitsBalance[tokenId] = this.tokenUnitsBalance[tokenId].sub(transaction.tokenUnitsBalance[tokenId])
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
}
