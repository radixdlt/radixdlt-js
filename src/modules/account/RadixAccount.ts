import RadixAccountSystem from './RadixAccountSystem';
import RadixNodeConnection from '../universe/RadixNodeConnection';
import { BehaviorSubject, Subject } from 'rxjs';
import RadixAtom from '../atom/RadixAtom';
import { radixUniverse } from '../universe/RadixUniverse';
import RadixKeyPair from '../wallet/RadixKeyPair';

export default class RadixAccount {
    private accountSystems: RadixAccountSystem[] = []

    private nodeConnection: RadixNodeConnection
    public connectionStatus: BehaviorSubject<string> = new BehaviorSubject('STARTING')    
    private atomSubscription: Subject<RadixAtom>

    constructor(readonly keyPair: RadixKeyPair) {
    }

    public addAccountSystem(system: RadixAccountSystem) {
        this.accountSystems.push(system)
    }

    public removeAccountSystem(system: RadixAccountSystem) {
        const index = this.accountSystems.indexOf(system)
        if (index > -1) {
            this.accountSystems.splice(index, 1)
        }
    }

    public openNodeConnection = async () => {
        this.connectionStatus.next('CONNECTING')
    
        try {
            this.nodeConnection = await radixUniverse.getNodeConnection(this.keyPair.getShard())
            this.connectionStatus.next('CONNECTED')
            this.nodeConnection.on('closed', this._onConnectionClosed)
        
            // Subscribe to events
            this.atomSubscription = this.nodeConnection.subscribe(this.keyPair.toString())
            this.atomSubscription.subscribe({
                next: this._onAtomReceived,
                error: err => console.error('Subscription error: ' + err),
            })
        } catch (err) {
            console.error(err)
            setTimeout(this._onConnectionClosed, 1000)
        }
    }

    private _onAtomReceived = (atom: RadixAtom) => {
        for (const system of this.accountSystems) {
            system.processAtom(atom)
        }    
    }
    
    private _onConnectionClosed = () => {
        // Get a new one
        this.openNodeConnection()
    }
}
