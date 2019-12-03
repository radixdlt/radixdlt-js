import { BehaviorSubject, Subject, Observable, combineLatest } from 'rxjs'
import { TSMap } from 'typescript-map'

import { RadixAccountSystem,
    RadixTransferAccountSystem, 
    RadixMessagingAccountSystem, 
    RadixDecryptionAccountSystem, 
    RadixDataAccountSystem,
    radixUniverse,
    RadixNodeConnection,
    RadixDecryptionProvider,
    RadixTokenDefinitionAccountSystem,
    RadixAtomNodeStatusUpdate,
    RadixAtomObservation,
 } from '../..'


import { logger } from '../common/RadixLogger'
import { RadixAtomUpdate, RadixAddress } from '../atommodel'
import { radixHash } from '../common/RadixUtil'
import { tap } from 'rxjs/operators'

export default class RadixAccount {
    public accountSystems: TSMap<string, RadixAccountSystem> = new TSMap()

    public decryptionSystem: RadixDecryptionAccountSystem
    public transferSystem: RadixTransferAccountSystem
    public dataSystem: RadixDataAccountSystem
    public messagingSystem: RadixMessagingAccountSystem
    public tokenDefinitionSystem: RadixTokenDefinitionAccountSystem

    private syncedSubject = new BehaviorSubject(false)
    private processingAtomCounter = new BehaviorSubject(0)

    private atomObservable: Observable<RadixAtomObservation>


    /**
     * An Account represents all the data stored in an address on the ledger. 
     * The account object also holds account systems, which process the data on the ledger into application level state
     * @param address Address of the account
     * @param [plain] If set to true, will not create default account systems.
     * Use this for accounts that will not be connected to the network
     */
    constructor(readonly address: RadixAddress, plain = false) {
        if (!plain) {
            this.decryptionSystem = new RadixDecryptionAccountSystem()
            this.addAccountSystem(this.decryptionSystem)

            this.tokenDefinitionSystem = new RadixTokenDefinitionAccountSystem(address)
            this.addAccountSystem(this.tokenDefinitionSystem)

            this.transferSystem = new RadixTransferAccountSystem(address)
            this.addAccountSystem(this.transferSystem)

            this.dataSystem = new RadixDataAccountSystem(address)
            this.addAccountSystem(this.dataSystem)

            this.messagingSystem = new RadixMessagingAccountSystem(address)
            this.addAccountSystem(this.messagingSystem)
        }

        this.atomObservable = radixUniverse.ledger.getAtomObservations(address)
        
        this.atomObservable.subscribe({
            next: this._onAtomReceived,
        })
    }

    /**
     * An Account represents all the data stored in an address on the ledger. 
     * The account object also holds account systems, which process the data on the ledger into application level state
     * @param address string address 
     * @param [plain] If set to false, will not create default account systems.
     * Use this for accounts that will not be connected to the network
     * @returns  
     */
    public static fromAddress(address: string, plain = false) {
        return new RadixAccount(RadixAddress.fromAddress(address), plain)
    }

    /**
     * Create an instance of a Radix account from an arbitrary byte buffer. This
     * could e.g. be a friendly name of an account, in which case it would be
     * created as <code>Buffer.from('friendly name')</code>.
     *
     * @param seed Buffer seed for the address
     * @param [plain] If set to true, will not create default account systems.
     * Use this for accounts that will not be connected to the network.
     * @returns a new Radix account. 
     */
    public static fromSeed(seed: Buffer, plain = false) {
        const hash = radixHash(seed)
        return new RadixAccount(RadixAddress.fromPrivate(hash), plain)
    }

    /**
     * Enable the account to decrypt ECIES encrypted data by providing it with a DecryptionProvider
     * @param decryptionProvider Any type of identity which is capable of derypting ECIES enrypted data
     */
    public enableDecryption(decryptionProvider: RadixDecryptionProvider) {
        this.decryptionSystem.decryptionProvider = decryptionProvider
    }

    /**
     * Get the address of this account
     */
    public getAddress() {
        return this.address.getAddress()
    }

    /**
     * Add a new account system to the account. The system will be fed all new atom observations
     * @param system A RadixAccountSystem which knows how to proccess atom observations into state
     */
    public addAccountSystem(system: RadixAccountSystem) {
        if (this.accountSystems.has(system.name)) {
            throw new Error(
                `System "${system.name}" already exists in account, you can only have one of each system per account`,
            )
        }

        this.accountSystems.set(system.name, system)

        return system
    }

    /**
     * Remove an account system by its name
     * @param name The name of the account system
     */
    public removeAccountSystem(name: string) {
        if (this.accountSystems.has(name)) {
            this.accountSystems.delete(name)
        }
    }

    /**
     * Get an account system by its name
     * @param name The name of the account system
     */
    public getSystem(name: string) {
        if (this.accountSystems.has(name)) {
            return this.accountSystems.get(name)
        }

        throw new Error(`System "${name}" doesn't exist in account`)
    }

    /**
     * An observable that tells you when the account is in sync with the network
     * 
     * @returns An observable which sends 'true' whenever the account has received and processed new information form the network
     */
    public isSynced(): Observable<boolean> {

        return combineLatest(
            radixUniverse.ledger.onSynced(this.atomObservable),
            this.processingAtomCounter.map((value) => value === 0),

            (val1, val2) => {
                return val1 && val2
            },
        ).filter(isSynced => isSynced)
    }

    private _onAtomReceived = async (atomObservation: RadixAtomObservation) => {
        this.processingAtomCounter.next(this.processingAtomCounter.getValue() + 1)

        atomObservation.processedData = {}
        for (const system of this.accountSystems.values()) {
            await system.processAtomUpdate(atomObservation)
        }

        this.processingAtomCounter.next(this.processingAtomCounter.getValue() - 1)
    }

    
}
