import { BehaviorSubject, Subject } from 'rxjs'
import { TSMap } from 'typescript-map'

import { RadixAccountSystem,
    RadixTransferAccountSystem, 
    RadixMessagingAccountSystem, 
    RadixDecryptionAccountSystem, 
    RadixDataAccountSystem,
    RadixAtomCacheProvider, 
    RadixCacheAccountSystem,
    radixUniverse,
    RadixNodeConnection,
    RadixDecryptionProvider,

 } from '../..'


import { logger } from '../common/RadixLogger'
import { RadixAtomUpdate, RadixAddress } from '../atommodel';

export default class RadixAccount {
    private nodeConnection: RadixNodeConnection
    private accountSystems: TSMap<string, RadixAccountSystem> = new TSMap()
    private atomSubscription: Subject<RadixAtomUpdate>

    public connectionStatus: BehaviorSubject<string> = new BehaviorSubject('STARTING')

    public cacheSystem: RadixCacheAccountSystem
    public decryptionSystem: RadixDecryptionAccountSystem
    public transferSystem: RadixTransferAccountSystem
    public dataSystem: RadixDataAccountSystem
    public messagingSystem: RadixMessagingAccountSystem

    /**
     * Creates an instance of radix account.
     * @param address Address of the account
     * @param [plain] If set to false, will not create default account systems.
     * Use this for accounts that will not be connected to the network
     */
    constructor(readonly address: RadixAddress, plain = false) {
        if (!plain) {
            this.cacheSystem = new RadixCacheAccountSystem(address)
            this.addAccountSystem(this.cacheSystem)

            this.decryptionSystem = new RadixDecryptionAccountSystem()
            this.addAccountSystem(this.decryptionSystem)

            this.transferSystem = new RadixTransferAccountSystem(address)
            this.addAccountSystem(this.transferSystem)

            this.dataSystem = new RadixDataAccountSystem(address)
            this.addAccountSystem(this.dataSystem)

            this.messagingSystem = new RadixMessagingAccountSystem(address)
            this.addAccountSystem(this.messagingSystem)
        }        
    }

    /**
     * Create an instance of radix account from an address
     * @param address string address 
     * @param [plain] If set to false, will not create default account systems.
     * Use this for accounts that will not be connected to the network
     * @returns  
     */
    public static fromAddress(address: string, plain = false) {
        return new RadixAccount(RadixAddress.fromAddress(address), plain)
    }

    public enableDecryption(decryptionProvider: RadixDecryptionProvider) {
        this.decryptionSystem.decryptionProvider = decryptionProvider
    }

    public enableCache(cacheProvider: RadixAtomCacheProvider) {
        this.cacheSystem.atomCache = cacheProvider

        // Load atoms from cache
        return this.cacheSystem.loadAtoms().then((atoms) => {
            for (const atom of atoms) {
                this._onAtomReceived({
                    action: 'STORE',
                    atom,
                })
            }
        })
    }

    public getAddress() {
        return this.address.getAddress()
    }

    public addAccountSystem(system: RadixAccountSystem) {
        if (this.accountSystems.has(system.name)) {
            throw new Error(
                `System "${system.name}" already exists in account, you can only have one of each system per account`
            )
        }

        this.accountSystems.set(system.name, system)

        return system
    }

    public removeAccountSystem(name: string) {
        if (this.accountSystems.has(name)) {
            this.accountSystems.delete(name)
        }
    }

    public getSystem(name: string) {
        if (this.accountSystems.has(name)) {
            return this.accountSystems.get(name)
        }

        throw new Error(`System "${name}" doesn't exist in account`)
    }

    public openNodeConnection = async () => {
        this.connectionStatus.next('CONNECTING')
        try {
            this.nodeConnection = await radixUniverse.getNodeConnection(
                this.address.getShard(),
            )
            this.connectionStatus.next('CONNECTED')
            this.nodeConnection.on('closed', this._onConnectionClosed)

            // Subscribe to events
            this.atomSubscription = this.nodeConnection.subscribe(
                this.address.toString(),
            )
            this.atomSubscription.subscribe({
                next: this._onAtomReceived,
                error: error => logger.error('Subscription error:', error)
            })
        } catch (error) {
            logger.error(error)
            setTimeout(this._onConnectionClosed, 1000)
        }
    }

    /**
     * Unsubscribes the node connection to the stream of past and future atoms associated with this address account
     * 
     * @returns A promise with the result of the unsubscription call
     */
    public closeNodeConnection = async () => {
        return this.nodeConnection.unsubscribe(this.getAddress())
    }

    public _onAtomReceived = async (atomUpdate: RadixAtomUpdate) => {
        for (const system of this.accountSystems.values()) {
            await system.processAtomUpdate(atomUpdate)
        }
    }

    private _onConnectionClosed = () => {
        // Get a new one
        this.openNodeConnection()
    }
}
