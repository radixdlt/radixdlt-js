/*
 * (C) Copyright 2020 Radix DLT Ltd
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the “Software”),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

import { BehaviorSubject, Observable, Observer, Subject } from 'rxjs'
import { TSMap } from 'typescript-map'

import RadixAccountSystem from './RadixAccountSystem'
import RadixTransaction from './RadixTransaction'
import RadixTransactionUpdate from './RadixTransactionUpdate'

import { RadixAddress, RadixConsumable, RadixSpin, RadixTransferrableTokensParticle, RadixUniqueParticle } from '../atommodel'
import { RadixDecryptionState } from './RadixDecryptionAccountSystem'

import BN from 'bn.js'
import { radixTokenManager } from '../token/RadixTokenManager'
import Decimal from 'decimal.js'
import { RadixTokenDefinition } from '../token/RadixTokenDefinition'
import { logger, RadixAtomObservation, RadixAtomStatusIsInsert, radixUniverse } from '../..'
import { filter, map } from 'rxjs/operators'

const doesTransactionContainUniqueString = (tx: RadixTransaction, unique: string): boolean => {
    return !!tx.unique.find(u => u.includes(unique))
}

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

    public async processAtomUpdate(atomUpdate: RadixAtomObservation) {
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

    private async processStoreAtom(atomUpdate: RadixAtomObservation) {

        const atom = atomUpdate.atom


        // Skip existing atoms
        if (this.transactions.has(atom.getAidString())) {
            return
        }

        for (const particleGroup of atom.particleGroups) {

            const transferrableTokensParticlesWithSpinUP = particleGroup.getParticlesOfType(RadixTransferrableTokensParticle, RadixSpin.UP)

            if (transferrableTokensParticlesWithSpinUP.length === 0) {
                continue
            }

            const transactionUpdate: RadixTransactionUpdate = {
                action: 'STORE',
                aid: atom.getAidString(),
                transaction: {
                    aid: atom.getAidString(),
                    balance: {},
                    tokenUnitsBalance: {},
                    fee: 0,
                    from: undefined,
                    to: undefined,
                    message: '',
                    unique: atom.getParticlesOfType(RadixUniqueParticle).map(p => p.getRRI().toString()),
                },
            }

            // const transaction = transactionUpdate.transaction

            // Get transaction message
            if (atomUpdate.processedData.decryptedData
                && atomUpdate.processedData.decryptedData.decryptionState !== RadixDecryptionState.CANNOT_DECRYPT) {
                transactionUpdate.transaction.message = atomUpdate.processedData.decryptedData.data
            }

            const consumables = atom.getSpunParticlesOfType(RadixTransferrableTokensParticle)



            // Get transaction details
            for (const consumable of consumables) {
                const spin = consumable.spin
                const particle = consumable.particle as RadixConsumable
                const tokenClassReference = particle.getTokenDefinitionReference()

                const ownedByMe = particle.getOwner().equals(this.address)

                // TODO: Implement Fees when they change to token fees

                // Assumes POW fee
                if (ownedByMe) {
                    const quantity = new BN(0)
                    const hid = particle.getHidString()

                    if (spin === RadixSpin.DOWN) {
                        quantity.isub(particle.getAmount())

                        this.unspentConsumables.delete(hid)
                        this.spentConsumables.set(hid, particle)
                    } else if (spin === RadixSpin.UP) {
                        quantity.iadd(particle.getAmount())

                        if (!this.spentConsumables.has(hid)) {
                            this.unspentConsumables.set(hid, particle)
                        }
                    }

                    if (!(tokenClassReference.toString() in transactionUpdate.transaction.balance)) {
                        transactionUpdate.transaction.balance[tokenClassReference.toString()] = new BN(0)
                    }
                    transactionUpdate.transaction.balance[tokenClassReference.toString()].iadd(quantity)
                }

                if (spin === RadixSpin.DOWN) {
                    if (!transactionUpdate.transaction.from) {
                        transactionUpdate.transaction.from = particle.getOwner()
                    }
                } else if (spin === RadixSpin.UP) {
                    if (!transactionUpdate.transaction.to) {
                        transactionUpdate.transaction.to = particle.getOwner()
                    }
                }
            }

            if (!transactionUpdate.transaction.to) {
                throw new Error(`ERROR transaction.to is not set`)
            }

            if (!transactionUpdate.transaction.from) {
                logger.error(`Tx.from is undefined, assuming from==to`)
                transactionUpdate.transaction.from = transactionUpdate.transaction.to
            }

            // Not a transfer
            if (Object.keys(transactionUpdate.transaction.balance).length === 0) {
                return
            }


            // Update balance
            for (const tokenId in transactionUpdate.transaction.balance) {
                // Load tokenclass from network
                // const tokenClass = await radixTokenManager.getTokenClass(tokenId)

                if (!(tokenId in this.balance) || !this.balance[tokenId]) {
                    this.balance[tokenId] = new BN(0)
                }

                this.balance[tokenId].iadd(transactionUpdate.transaction.balance[tokenId])

                // Token units
                transactionUpdate.transaction.tokenUnitsBalance[tokenId] = RadixTokenDefinition.fromSubunitsToDecimal(transactionUpdate.transaction.balance[tokenId])

                if (!(tokenId in this.tokenUnitsBalance) || !this.balance[tokenId]) {
                    this.tokenUnitsBalance[tokenId] = new Decimal(0)
                }

                this.tokenUnitsBalance[tokenId] = this.tokenUnitsBalance[tokenId].add(transactionUpdate.transaction.tokenUnitsBalance[tokenId])
            }

            this.transactions.set(transactionUpdate.aid, transactionUpdate.transaction)

            this.balanceSubject.next(this.balance)
            this.tokenUnitsBalanceSubject.next(this.tokenUnitsBalance)
            this.transactionSubject.next(transactionUpdate)
        }
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

    public getTransactionWithUniqueString(unique: string): Observable<RadixTransaction> {
        return this.getAllTransactions()
            .pipe(
                filter(tu => doesTransactionContainUniqueString(tu.transaction, unique)),
            )
            .pipe(
                map(tu => tu.transaction),
            )
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
            },
        )
    }

    public getUnspentConsumables() {
        return this.unspentConsumables.values()
    }

    public getTokenUnitsBalanceUpdates() {
        return this.tokenUnitsBalanceSubject.share()
    }
}
