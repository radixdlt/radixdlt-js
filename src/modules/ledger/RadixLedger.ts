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

import { RadixUniverse, RadixAtom, RadixAtomStore, RadixAtomNodeStatus, RadixAtomNodeStatusUpdate, logger, RadixAtomObservation } from '../..';
import { RadixAtomUpdate, RadixAddress, RadixSerializer, RadixAtomEvent } from '../atommodel';
import { Subject, Observable, merge, BehaviorSubject, combineLatest } from 'rxjs';
import RadixNodeConnection, { AtomReceivedNotification } from '../universe/RadixNodeConnection';
import { takeWhile, multicast, publish, tap } from 'rxjs/operators';
import { TSMap } from 'typescript-map';
import promiseRetry from 'promise-retry'



export class RadixLedger {

    private networkAccountSubscriptions: {[address: string]: Observable<AtomReceivedNotification>} = {}
    private networkSyncedSubjects: {[address: string]: BehaviorSubject<boolean>} = {}

    private syncSubjects = new TSMap<Observable<RadixAtomObservation>, Observable<boolean>>()

    private finalityTimeouts: {[aid: string]: NodeJS.Timeout} = {}

    constructor(
        readonly universe: RadixUniverse, 
        readonly atomStore: RadixAtomStore,
        readonly finalityTime: number,
    ) {
        this.atomStore.getAtomObservations().subscribe(this.monitorAtomFinality)
    }

    

    /**
     * Get an observable for all atom updates for a certain address, starting from old atoms
     * and continuing indefinitely into the future
     * 
     * @param  {RadixAddress} address
     * @returns Observable
     */
    public getAtomObservations(address: RadixAddress): Observable<RadixAtomObservation> {
        this.setUpNetworkSubscription(address).catch(e => {
            logger.error(e)
        })

        const hasSyncedStore = new BehaviorSubject(false)

        const atomObservable =  merge(
            this.atomStore.getStoredAtomObservations(address).pipe(
                tap({
                    complete: () => {
                        hasSyncedStore.next(true)
                    }
                }),
            ),
            this.atomStore.getAtomObservations(address),
        )
        
        this.syncSubjects.set(atomObservable, combineLatest(
            hasSyncedStore,
            this.getSyncedSubject(address),

            (val1, val2) => {
                return val1 && val2
            },
        ))
        

        return atomObservable
    }
    /**
     * Submit an atom to the ledger. This will insert the atom in the local ledger with a 'PENDING' status
     * as well as submit it to the specified node
     * 
     * @param  {RadixAtom} atom Fully ready atom, signed and with a fee
     * @param  {RadixNodeConnection} node The submission node
     */
    public submitAtom(atom: RadixAtom, node: RadixNodeConnection): Observable<RadixAtomNodeStatusUpdate> {
        this.atomStore.insert(atom, {
            status: RadixAtomNodeStatus.PENDING,
        }).then(() => {
            node.submitAtom(atom).subscribe({
                next: (update) => {
                    this.atomStore.updateStatus(atom.getAid(), update)
                }, 
                error: (e) => {
                    this.atomStore.updateStatus(atom.getAid(), {
                        status: RadixAtomNodeStatus.SUBMISSION_ERROR,
                        data: e,
                    })
                },
            })
        })
        

        return this.atomStore.getAtomStatusUpdates(atom.getAid()).pipe(takeWhile((update) => {
            switch (update.status) {
                case RadixAtomNodeStatus.SUBMISSION_ERROR:
                case RadixAtomNodeStatus.MISSING_DEPEPENDENCY:
                case RadixAtomNodeStatus.EVICTED_FAILED_CM_VERIFICATION:
                case RadixAtomNodeStatus.EVICTED_CONFLICT_LOSER_FINAL:
                    throw update
                case RadixAtomNodeStatus.STORED_FINAL:
                    return false
                default:
                    return true
            }
        }, true))
    }

    /**
     * Returns a stream of boolean notifiations, telling you whether a certain subscription is up to date
     * This will trigger true every time new atoms are received and processed
     * 
     * Useful for knowing when you can check whether a certain account has something in it or not
     * 
     * @param  {Observable<RadixAtomObservation>} observable The subscription from `getAtomObservations`
     * @returns Observable<boolean> Synchronization status
     */
    public onSynced(observable: Observable<RadixAtomObservation>): Observable<boolean> {
        if (!this.syncSubjects.has(observable)) {
            throw new Error(`Subscription doesn't exist`)
        }
        
        return this.syncSubjects.get(observable)
    }

    private getSyncedSubject(address: RadixAddress, defaultValue: boolean = false) {
        const strAddress = address.toString()

        if (!(strAddress in this.networkSyncedSubjects)) {
            this.networkSyncedSubjects[strAddress] = new BehaviorSubject(defaultValue)
        }

        return this.networkSyncedSubjects[strAddress]
    }


    private onAtomUpdateReceived = (notification: AtomReceivedNotification, address: RadixAddress) => {
        const deserializedAtomEvents = RadixSerializer.fromJSON(notification.atomEvents) as RadixAtomEvent[]

        for (const event of deserializedAtomEvents) {

            // Put in db
            if (event.type.toUpperCase() === 'STORE') {
                this.atomStore.insert(event.atom, {
                    status: RadixAtomNodeStatus.STORED,
                })
            } else if (event.type.toUpperCase() === 'DELETE') {
                this.atomStore.insert(event.atom, {
                    status: RadixAtomNodeStatus.CONFLICT_LOSER,
                })
            } else {
                logger.error(`Unsupoorted atom event type received "${event.type.toUpperCase()}"`)
            }
        }

        // Handle sync status updates
        const syncer = this.getSyncedSubject(address, notification.isHead)
        syncer.next(notification.isHead)
    }

    private async setUpNetworkSubscription(address: RadixAddress) {
        if (address.toString() in this.networkAccountSubscriptions) {
            return this.networkAccountSubscriptions[address.toString()]
        }


        const connection = await promiseRetry(
            async (retry, attempt) => {
                try {
                    return await this.universe.getNodeConnection(address.getShard())
                } catch (e) {
                    logger.error(e)
                    logger.info('retrying...')
                    retry(e)
                }
            }, {
            retries: 1000,
            maxtimeout: 60000,
        })

        const subscription = connection.subscribe(address.toString())

        this.networkAccountSubscriptions[address.toString()] = subscription

        subscription.subscribe({ 
            next: (update) => { 
                this.onAtomUpdateReceived(update, address)
            },
            error: () => { 
                setTimeout(() => {
                    this.getSyncedSubject(address, false).next(false)
                    this.setUpNetworkSubscription(address) 
                }, 1000)
            },
        })

        return subscription
    }


    private monitorAtomFinality = (observation: RadixAtomObservation) => {
        const aid = observation.atom.getAid()
        const aidString = aid.toString()

        if (aidString in this.finalityTimeouts) {
            clearTimeout(this.finalityTimeouts[aidString])
        }

        if (observation.status.status === RadixAtomNodeStatus.STORED) {
            this.finalityTimeouts[aidString] = setTimeout(() => {
                this.atomStore.updateStatus(aid, { status: RadixAtomNodeStatus.STORED_FINAL })
                delete this.finalityTimeouts[aidString]
            }, this.finalityTime)
        } else if (observation.status.status === RadixAtomNodeStatus.CONFLICT_LOSER) {
            this.finalityTimeouts[aidString] = setTimeout(() => {
                this.atomStore.updateStatus(aid, { status: RadixAtomNodeStatus.EVICTED_CONFLICT_LOSER_FINAL })
                delete this.finalityTimeouts[aidString]
            }, this.finalityTime)
        }
    }



}
