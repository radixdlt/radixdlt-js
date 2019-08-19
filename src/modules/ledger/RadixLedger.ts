import { RadixUniverse, RadixAtom, RadixAtomCacheProvider, RadixAtomStatusUpdate, RadixAtomStore, RadixAtomStatus, RadixAtomNodeStatus, RadixAtomNodeStatusUpdate } from '../..';
import { RadixAtomUpdate, RadixAddress } from '../atommodel';
import { Subject, Observable, merge } from 'rxjs';
import RadixNodeConnection from '../universe/RadixNodeConnection';



export class RadixLedger {

    private accountSubscriptions: {[address: string]: Observable<RadixAtomUpdate>} = {}

    private finalityTimeouts: {[aid: string]: NodeJS.Timeout} = {}

    constructor(
        readonly universe: RadixUniverse, 
        readonly atomStore: RadixAtomStore,
        readonly finalityTime: number,
    ) {
        this.atomStore.getAtomObservations().subscribe(this.monitorAtomFinality)
    }

    


    public getAtomObservations(address: RadixAddress): Observable<RadixAtomNodeStatusUpdate> {
        this.getSubscrtiption(address).then(subscription => {
            subscription.subscribe(this.onAtomUpdateReceived)
        })

        return merge(
            this.atomStore.getStoredAtomObservations(address),
            this.atomStore.getAtomObservations(address),
        )
    }

    public submitAtom(atom: RadixAtom, node: RadixNodeConnection): Observable<RadixAtomNodeStatusUpdate> {
        node.submitAtom(atom).subscribe((update) => {
            this.atomStore.updateStatus(atom.getAid(), update)
        })

        return this.atomStore.getAtomStatusUpdates(atom.getAid())
    }


    private onAtomUpdateReceived(update: RadixAtomUpdate) {
        // Put in db
        if (update.action === 'STORED') {
            this.atomStore.insert(update.atom, {
                status: RadixAtomNodeStatus.STORED,
            })
        } else {
            this.atomStore.insert(update.atom, {
                status: RadixAtomNodeStatus.EVICTED_CONFLICT_LOSER,
            })
        }
    }

    private async getSubscrtiption(address: RadixAddress) {
        if (address.toString() in this.accountSubscriptions) {
            return this.accountSubscriptions[address.toString()]
        }

        const connection = await this.universe.getNodeConnection(address.getShard())

        // OnClosed
        // Retry
        // Hook up new subscriptions

        const subscription = connection.subscribe(address.toString())

        this.accountSubscriptions[address.toString()] = subscription

        return subscription
    }


    private monitorAtomFinality(observation: {
        atom: RadixAtom,
        status: RadixAtomNodeStatusUpdate,
        timestamp: number,
    }) {
        const aid = observation.atom.getAid()
        
        clearTimeout(this.finalityTimeouts[aid.toString()])

        if (observation.status.status === RadixAtomNodeStatus.STORED) {
            this.finalityTimeouts[aid.toString()] = setTimeout(() => {
                this.atomStore.updateStatus(aid, {status: RadixAtomNodeStatus.STORED_FINAL})
                delete this.finalityTimeouts[aid.toString()]
            }, this.finalityTime)
        } else if (observation.status.status === RadixAtomNodeStatus.EVICTED_CONFLICT_LOSER) {
            this.finalityTimeouts[aid.toString()] = setTimeout(() => {
                this.atomStore.updateStatus(aid, {status: RadixAtomNodeStatus.EVICTED_CONFLICT_LOSER_FINAL})
                delete this.finalityTimeouts[aid.toString()]
            }, this.finalityTime)
        }
    }



}
