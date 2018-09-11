import RadixAccountSystem from './RadixAccountSystem';
import RadixAtom from '../atom/RadixAtom';
import RadixTransactionAtom from '../atom/RadixTransactionAtom';
import { Subject, Observable, Observer, BehaviorSubject } from 'rxjs';
import { TSMap } from 'typescript-map';
import RadixTransaction from './RadixTransaction';
import RadixTransactionUpdate from './RadixTransactionUpdate';
import RadixConsumer from '../atom/RadixConsumer';
import RadixConsumable from '../atom/RadixConsumable';
import RadixEmission from '../atom/RadixEmission';
import { radixToken } from '../token/RadixToken';
import RadixParticle from '../atom/RadixParticle';
import RadixAtomFeeConsumable from '../fees/RadixAtomFeeConsumable';
import { RadixKeyPair, radixConfig } from '../..';

export default class RadixTransferAccountSystem implements RadixAccountSystem {
    
    public transactions: TSMap<string, RadixTransaction> = new TSMap()
    public balance: { [tokenId: string]: number } = {}
    
    public transactionSubject: Subject<RadixTransactionUpdate> = new Subject()
    public balanceSubject: BehaviorSubject<{ [tokenId: string]: number }>

    private unspentConsumables: TSMap<string, RadixParticle> = new TSMap()
    private spentConsumables: TSMap<string, RadixParticle> = new TSMap()

    constructor(readonly keyPair: RadixKeyPair) {
        //
    }

    
    public initialize() {
        // Add default radix token to balance
        this.balance[radixToken.getTokenByISO(radixConfig.mainTokenISO).id.toString()] = 0
        this.balanceSubject = new BehaviorSubject(this.balance)
    }


    public processAtom(atom: RadixAtom) {
        if (atom.serializer !== RadixTransactionAtom.SERIALIZER) {
            return
        }

        if (atom.action === 'STORE') {
            this.processStoreAtom(atom as RadixTransactionAtom)
        } else if (atom.action === 'DELETE') {
            this.processDeleteAtom(atom as RadixTransactionAtom)
        }
    }


    private processStoreAtom(atom: RadixTransactionAtom) {
        const transactionUpdate: RadixTransactionUpdate = {
            type: 'STORE',
            hid: atom.hid.toString(),
            transaction: {
                hid: atom.hid.toString(),
                balance: {},
                fee: 0,
                participants: {},
                timestamp: atom.timestamps.default,
                message: '',
            },
        }
        const transaction = transactionUpdate.transaction

        // Get transaction message
        try {
            // TODO
            // transaction.message = atom.getDecryptedPayload(this.keyPair)
        } catch (e) {
            // console.log(e)
        }

        // Get transaction details
        for (const particle of atom.particles as Array<RadixConsumer | RadixConsumable | RadixEmission>) {
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
                    transaction.participants[keyPair.getAddress()] = keyPair.getAddress()
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
        const hid = atom.hid.toString()
        const transaction = this.transactions.get(hid)
        const transactionUpdate: RadixTransactionUpdate = {
            type: 'DELETE',
            hid,
            transaction,
        }

        // Update consumables
        for (const particle of atom.particles as Array<RadixConsumer | RadixConsumable | RadixEmission>) {
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
      
            const isFee = particle.serializer === RadixAtomFeeConsumable.SERIALIZER
      
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
        return Observable.create((observer: Observer<RadixTransactionUpdate>) => {
            // Send all old transactions
            for (const transaction of this.transactions.values()) {
                const transactionUpdate = {
                    type: 'STORE',
                    hid: transaction.hid,
                    transaction,
                }

                observer.next(transactionUpdate)
            }
    
            // Subscribe for new ones
            this.transactionSubject.subscribe(observer)
        })
    }


    public getUnspentConsumables() {
        return this.unspentConsumables
    }
}
