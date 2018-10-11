import { BehaviorSubject, Subject } from 'rxjs'
import { TSMap } from 'typescript-map'

import RadixAccountSystem from './RadixAccountSystem'
import RadixNodeConnection from '../universe/RadixNodeConnection'
import RadixKeyPair from '../wallet/RadixKeyPair'
import RadixAtomUpdate from '../atom/RadixAtomUpdate'
import RadixDataAccountSystem from './RadixDataAccountSystem'
import RadixDecryptionProvider from '../identity/RadixDecryptionProvider'

import { radixUniverse } from '../universe/RadixUniverse'
import { RadixAtom } from '../RadixAtomModel'
import { RadixTransferAccountSystem, RadixMessagingAccountSystem, RadixDecryptionAccountSystem, RadixAtomCacheProvider, RadixCacheAccountSystem } from '../..'

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
     * @param keyPair Public key of the account
     * @param [plain] If set to false, will not create default account systems.
     * Use this for accounts that will not be connected to the network
     */
    constructor(readonly keyPair: RadixKeyPair, plain = false) {
        if (!plain) {
            this.cacheSystem = new RadixCacheAccountSystem(keyPair)
            this.addAccountSystem(this.cacheSystem)

            this.decryptionSystem = new RadixDecryptionAccountSystem()
            this.addAccountSystem(this.decryptionSystem)

            this.transferSystem = new RadixTransferAccountSystem(keyPair)
            this.addAccountSystem(this.transferSystem)

            this.dataSystem = new RadixDataAccountSystem(keyPair)
            this.addAccountSystem(this.dataSystem)

            this.messagingSystem = new RadixMessagingAccountSystem(keyPair)
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
        return new RadixAccount(RadixKeyPair.fromAddress(address), plain)
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
        return this.keyPair.getAddress()
    }

    public addAccountSystem(system: RadixAccountSystem) {
        if (this.accountSystems.has(system.name)) {
            throw new Error(
                `System "${
                    system.name
                }" already exists in account, you can only have one of each system per account`
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
                this.keyPair.getShard()
            )
            this.connectionStatus.next('CONNECTED')
            this.nodeConnection.on('closed', this._onConnectionClosed)

            // Subscribe to events
            this.atomSubscription = this.nodeConnection.subscribe(
                this.keyPair.toString()
            )
            this.atomSubscription.subscribe({
                next: this._onAtomReceived,
                error: error => console.error(`Subscription error: ${error}`)
            })
        } catch (error) {
            console.error(error)
            setTimeout(this._onConnectionClosed, 1000)
        }
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
