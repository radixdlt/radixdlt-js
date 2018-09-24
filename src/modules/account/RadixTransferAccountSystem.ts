import { Subject, Observable, Observer, BehaviorSubject } from 'rxjs'
import { TSMap } from 'typescript-map'

import RadixAccountSystem from './RadixAccountSystem'
import RadixTransaction from './RadixTransaction'
import RadixTransactionUpdate from './RadixTransactionUpdate'

import { RadixKeyPair } from '../..'
import { radixToken } from '../token/RadixToken'
import { radixConfig } from '../common/RadixConfig'
import {
    RadixAtom,
    RadixTransactionAtom,
    RadixConsumer,
    RadixConsumable,
    RadixEmission,
    RadixParticle,
    RadixAtomFeeConsumable,
    RadixAtomUpdate
} from '../atom_model'

import * as Long from 'long'

export default class RadixTransferAccountSystem implements RadixAccountSystem {
    public name = 'TRANSFER'

    public transactions: TSMap<string, RadixTransaction> = new TSMap()
    public balance: { [tokenId: string]: number } = {}

    public transactionSubject: Subject<RadixTransactionUpdate> = new Subject()
    public balanceSubject: BehaviorSubject<{ [tokenId: string]: number }>

    private unspentConsumables: TSMap<string, RadixParticle> = new TSMap()
    private spentConsumables: TSMap<string, RadixParticle> = new TSMap()

    constructor(readonly keyPair: RadixKeyPair) {
        // Add default radix token to balance
        this.balance[
            radixToken.getTokenByISO(radixConfig.mainTokenISO).id.toString()
        ] = 0
        this.balanceSubject = new BehaviorSubject(this.balance)
    }

    public async processAtomUpdate(atomUpdate: RadixAtomUpdate) {
        const atom = atomUpdate.atom
        if (atom.serializer !== RadixTransactionAtom.SERIALIZER) {
            return
        }

        if (atomUpdate.action === 'STORE') {
            this.processStoreAtom(atom as RadixTransactionAtom)
        } else if (atomUpdate.action === 'DELETE') {
            this.processDeleteAtom(atom as RadixTransactionAtom)
        }
    }

    private processStoreAtom(atom: RadixTransactionAtom) {
        // Skip existing atoms
        if (this.transactions.has(atom.hid.toString())) {
            return
        }

        const transactionUpdate: RadixTransactionUpdate = {
            action: 'STORE',
            hid: atom.hid.toString(),
            transaction: {
                hid: atom.hid.toString(),
                balance: {},
                fee: 0,
                participants: {},
                timestamp: atom.timestamps.default,
                message: ''
            }
        }
        const transaction = transactionUpdate.transaction

        // Get transaction message
        if (typeof atom.payload === 'string') {
            transaction.message = atom.payload
        }

        // Get transaction details
        for (const particle of atom.particles as Array<
            RadixConsumer | RadixConsumable | RadixEmission
        >) {
            const tokenId = particle.asset_id.toString()
            if (!radixToken.getTokenByID(tokenId)) {
                throw new Error('Unsuporeted Token Class')
            }

            let ownedByMe = false
            for (const owner of particle.owners) {
                if (owner.public.data.equals(this.keyPair.getPublic())) {
                    ownedByMe = true
                    break
                }
            }

            const isFee = particle.serializer === RadixAtomFeeConsumable.SERIALIZER

            if (ownedByMe && !isFee) {
                let quantity = 0
                if (particle.serializer === RadixConsumer.SERIALIZER) {
                    quantity -= particle.quantity

                    this.unspentConsumables.delete(particle._id)
                    this.spentConsumables.set(particle._id, particle)
                } else if (
                    particle.serializer === RadixConsumable.SERIALIZER ||
                    particle.serializer === RadixEmission.SERIALIZER
                ) {
                    quantity += particle.quantity

                    if (!this.spentConsumables.has(particle._id)) {
                        this.unspentConsumables.set(particle._id, particle)
                    }
                }

                if (!(tokenId in transaction.balance)) {
                    transaction.balance[tokenId] = 0
                }
                transaction.balance[tokenId] += quantity
            } else if (!ownedByMe && !isFee) {
                for (const owner of particle.owners) {
                    const keyPair = RadixKeyPair.fromRadixECKeyPair(owner)
                    transaction.participants[
                        keyPair.getAddress()
                    ] = keyPair.getAddress()
                }
            }
        }

        this.transactions.set(transactionUpdate.hid, transaction)

        // Update balance
        for (const tokenId in transaction.balance) {
            if (!(tokenId in this.balance)) {
                this.balance[tokenId] = 0
            }

            this.balance[tokenId] += transaction.balance[tokenId]
        }

        this.balanceSubject.next(this.balance)
        this.transactionSubject.next(transactionUpdate)
    }

    private processDeleteAtom(atom: RadixTransactionAtom) {
        // Skip nonexisting atoms
        if (!this.transactions.has(atom.hid.toString())) {
            return
        }

        const hid = atom.hid.toString()
        const transaction = this.transactions.get(hid)
        const transactionUpdate: RadixTransactionUpdate = {
            action: 'DELETE',
            hid,
            transaction,
        }

        // Update consumables
        for (const particle of atom.particles as Array<
            RadixConsumer | RadixConsumable | RadixEmission
        >) {
            const tokenId = particle.asset_id.toString()
            if (!radixToken.getCurrentTokens()[tokenId]) {
                throw new Error('Unsuporeted Token Class')
            }

            let ownedByMe = false
            for (const owner of particle.owners) {
                if (owner.public.data.equals(this.keyPair.getPublic())) {
                    ownedByMe = true
                    break
                }
            }

            const isFee =
                particle.serializer === RadixAtomFeeConsumable.SERIALIZER

            if (ownedByMe && !isFee) {
                if (particle.serializer === RadixConsumer.SERIALIZER) {
                    this.unspentConsumables.set(particle._id, particle)
                    this.spentConsumables.delete(particle._id)
                } else if (
                    particle.serializer === RadixConsumable.SERIALIZER ||
                    particle.serializer === RadixEmission.SERIALIZER
                ) {
                    this.unspentConsumables.delete(particle._id)
                }
            }
        }

        // Update balance
        for (const tokenId in transaction.balance) {
            if (!(tokenId in this.balance)) {
                this.balance[tokenId] = 0
            }

            this.balance[tokenId] -= transaction.balance[tokenId]
        }

        this.balanceSubject.next(this.balance)
        this.transactionSubject.next(transactionUpdate)
    }

    public getAllTransactions(): Observable<RadixTransactionUpdate> {
        return Observable.create(
            (observer: Observer<RadixTransactionUpdate>) => {
                // Send all old transactions
                for (const transaction of this.transactions.values()) {
                    const transactionUpdate: RadixTransactionUpdate = {
                        action: 'STORE',
                        hid: transaction.hid,
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
        return this.unspentConsumables
    }
}
