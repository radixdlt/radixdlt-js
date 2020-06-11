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

import { BehaviorSubject, Subject, Observable } from 'rxjs/Rx'
import { Client } from 'rpc-websockets'


import { RadixAtom, RadixEUID, RadixSerializer, RadixAtomUpdate, RadixAtomEvent } from '../atommodel'
import { logger } from '../common/RadixLogger'

import events from 'events'

import fs from 'fs'
import { RadixNode, RadixAtomNodeStatusUpdate, RadixAtomNodeStatus, radixUniverse } from '../..'

interface Notification {
    subscriberId: number
}

export interface AtomReceivedNotification extends Notification {
    atomEvents: any[],
    isHead: boolean,
}

interface AtomStatusNotification extends Notification {
    status: string
    data?: {
        pointerToIssue?: string,
        message: string,
    }
}

interface AtomSubmissionStateUpdateNotification extends Notification {
    value: string
    data?: {
        pointerToIssue?: string,
        message: string,
    }
}

export declare interface RadixNodeConnection {
    on(event: 'closed' | 'open', listener: () => void): this
}


export class RadixNodeConnection extends events.EventEmitter {
    private pingInterval

    private _socket: Client
    private _subscriptions: { [subscriberId: string]: Subject<AtomReceivedNotification> } = {}
    private _atomUpdateSubjects: { [subscriberId: string]: BehaviorSubject<RadixAtomNodeStatusUpdate> } = {}

    private _addressSubscriptions: { [address: string]: string } = {}

    private lastSubscriberId = 1

    public address: string

    constructor(readonly node: RadixNode) {
        super()
        this.node = node
    }

    private getSubscriberId() {
        this.lastSubscriberId++
        return this.lastSubscriberId + ''
    }

    /**
     * Check whether the node connection is ready for requests
     * @returns true if ready
     */
    public isReady(): boolean {
        return this._socket && this._socket.ready
    }

    private ping = () => {
        if (this.isReady()) {
            this._socket
                .call('Ping', { id: 0 }).then((response: any) => {
                    logger.debug(`Ping`, response)
                }).catch((error: any) => {
                    logger.warn(`Error sending ping`, error)
                })
        }
    }

    /**
     * Opens connection
     * @returns a promise that resolves once the connection is ready, or rejects on error or timeout
     */
    public async openConnection(): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this.address = this.node.wsAddress

            // For testing atom queueing during connection issues
            // if (Math.random() > 0.1) {
            //    this.address += 'garbage'
            // }

            logger.info(`Connecting to ${this.address}`)

            this._socket = new Client(this.address, { reconnect: false })

            this._socket.on('close', this._onClosed)

            this._socket.on('error', error => {
                logger.error(error)
                reject(error)
            })

            setTimeout(() => {
                if (!this._socket.ready) {
                    logger.debug('Socket timeout')
                    this._socket.close()
                    this.emit('closed')
                    reject('Timeout')
                }
            }, 5000)

            this._socket.on('open', () => {
                logger.info(`Connected to ${this.address}`)

                this.pingInterval = setInterval(this.ping, 10000)

                this.emit('open')

                this._socket
                    .call('Universe.getUniverse', {})
                    .then((response: any) => {
                        const nodeHid = response.hid
                        const localHid = radixUniverse.universeConfig.getHid().toJSON()

                        if (nodeHid !== localHid) {
                            logger.error(
                                `ERROR: Universe configuration mismatch while connecting to node ${this.address}.
                                 Check your local universe config.`,
                                {
                                    localHid,
                                    nodeHid,
                                })
                            this.close()
                        }
                    })

                this._socket.on('Atoms.subscribeUpdate', this._onAtomReceivedNotification)
                this._socket.on('AtomSubmissionState.onNext', this._onAtomSubmissionStateUpdate)
                this._socket.on('Atoms.nextStatusEvent', this._onAtomStatusNotification)

                resolve()
            })
        })
    }

    /**
     * Subscribe for all existing and future atoms for a given address
     * 
     * @param address Base58 formatted address
     * @returns A stream of atoms
     */
    public subscribe(address: string): Observable<AtomReceivedNotification> {
        const subscriberId = this.getSubscriberId()

        this._addressSubscriptions[address] = subscriberId
        this._subscriptions[subscriberId] = new Subject<AtomReceivedNotification>()

        this._socket
            .call('Atoms.subscribe', {
                subscriberId,
                query: {
                    address,
                },
                debug: true,
            })
            .then((response: any) => {
                logger.info(`Subscribed for address ${address}`, response)
            })
            .catch((error: any) => {
                logger.error(`Error subscribing for address ${address}`, error)

                this._subscriptions[subscriberId].error(error)
            })

        return this._subscriptions[subscriberId].share()
    }

    /**
     * Unsubscribe for all existing and future atoms for a given address
     * 
     * @param address - Base58 formatted address
     * @returns A promise with the result of the unsubscription call
     */
    public unsubscribe(address: string): Promise<any> {
        const subscriberId = this._addressSubscriptions[address]

        return new Promise<any>((resolve, reject) => {
            this._socket
                .call('Atoms.cancel', {
                    subscriberId,
                })
                .then((response: any) => {
                    logger.info(`Unsubscribed for address ${address}`)

                    this._subscriptions[this._addressSubscriptions[address]].complete()

                    delete this._addressSubscriptions[address]

                    resolve(response)
                })
                .catch((error: any) => {
                    reject(error)
                })
        })
    }

    /**
     * Unsubscribes to all the addresses this node is subscribed to
     * 
     * @returns An array with the result of each unsubscription
     */
    public unsubscribeAll(): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            const unsubscriptions = new Array<Promise<any>>()
            for (const address in this._addressSubscriptions) {
                unsubscriptions.push(this.unsubscribe(address))
            }

            Promise.all(unsubscriptions)
                .then((values) => {
                    resolve(values)
                })
                .catch((error) => {
                    reject(error)
                })
        })
    }

    /**
     * Submit an atom to the ledger
     * 
     * @param atom - The atom to be submitted
     * @returns A stream of the status of the atom submission
     */
    public submitAtom(atom: RadixAtom) {

        // // Store atom for testing
        // let jsonPath = path.join('./submitAtom.json')
        // logger.info(jsonPath)
        // fs.writeFile(jsonPath, JSON.stringify(atom.toJSON()), (error) => {
        //    // Throws an error, you could also catch it here
        //    if (error) { throw error }

        //    // Success case, the file was saved
        //    logger.info('Atom saved!')
        // })

        const subscriberId = this.getSubscriberId()

        const atomStateSubject = new BehaviorSubject({ status: RadixAtomNodeStatus.PENDING })

        this._atomUpdateSubjects[subscriberId] = atomStateSubject

        const timeout = setTimeout(() => {
            this._socket.close()
            atomStateSubject.error('Socket timeout')
        }, 5000)

        this._socket
            .call('Atoms.getAtomStatusNotifications', {
                subscriberId,
                aid: atom.getAidString(),
            })
            .then((response: any) => {
                const atomJSON = RadixSerializer.toJSON(atom)
                return this._socket.call('Atoms.submitAtom', atomJSON)
            })
            .then((response: any) => {
                if (response.aid !== atom.getAidString()) {
                    throw new Error(
                        `Local AID "${atom.getAidString()}" does not match that computed on the node "${response.aid}".
This is a radixdlt-js issue, please report this at https://github.com/radixdlt/radixdlt-js/issues . 
The atom may or may not have been accepted by the node.
                    `)
                }

                clearTimeout(timeout)
            })
            .catch((error: any) => {
                clearTimeout(timeout)
                atomStateSubject.error(error)
            })


        return atomStateSubject.share()
    }

    /**
     * NOT IMPLEMENTED
     * Query the ledger for an atom by its id
     * @param id
     * @returns The atom
     */
    public async getAtomById(id: RadixEUID) {
        // TODO: everything
        return this._socket
            .call('Atoms.getAtomInfo', { id: id.toJSON() })
            .then((response: any) => {
                return RadixSerializer.fromJSON(response.result) as RadixAtom
            })
    }

    public close = async () => {
        await this.unsubscribeAll() 

        this._socket.close()

        clearInterval(this.pingInterval)
    }

    private _onClosed = () => {
        logger.info('Socket closed')

        clearInterval(this.pingInterval)
    
        this.emit('closed')
    }

    private _onAtomStatusNotification = (notification: AtomStatusNotification) => {
        logger.info('Atom Status notification', notification)

        // Handle atom state update
        const subscriberId = notification.subscriberId
        const subject = this._atomUpdateSubjects[subscriberId]
        const value = notification.status

        subject.next({ status: RadixAtomNodeStatus[value], data: notification.data })
    }

    private _onAtomSubmissionStateUpdate = (notification: AtomSubmissionStateUpdateNotification) => {
        logger.info('Atom Submission state update', notification)

        // Don't do anything here currently
    }

    private _onAtomReceivedNotification = (notification: AtomReceivedNotification) => {
        logger.debug('Atoms notification', notification)

        const subscription = this._subscriptions[notification.subscriberId]
        subscription.next(notification)
    }
}

export default RadixNodeConnection
