import { BehaviorSubject, Subject } from 'rxjs'
import { TSMap } from 'typescript-map'

import RadixAccountSystem from './RadixAccountSystem'
import RadixNodeConnection from '../universe/RadixNodeConnection'
import RadixKeyPair from '../wallet/RadixKeyPair'

import { radixUniverse } from '../universe/RadixUniverse'
import { RadixAtom } from '../atom_model'

export default class RadixAccount {
    private accountSystems: TSMap<string, RadixAccountSystem> = new TSMap()

    private nodeConnection: RadixNodeConnection
    public connectionStatus: BehaviorSubject<string> = new BehaviorSubject(
        'STARTING'
    )
    private atomSubscription: Subject<RadixAtom>

    constructor(readonly keyPair: RadixKeyPair) {}

    public static fromAddress(address: string) {
        return new RadixAccount(RadixKeyPair.fromAddress(address))
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
                error: err => console.error('Subscription error: ' + err)
            })
        } catch (err) {
            console.error(err)
            setTimeout(this._onConnectionClosed, 1000)
        }
    }

    private _onAtomReceived = async (atom: RadixAtom) => {
        for (const system of this.accountSystems.values()) {
            await system.processAtom(atom)
        }
    }

    private _onConnectionClosed = () => {
        // Get a new one
        this.openNodeConnection()
    }
}
