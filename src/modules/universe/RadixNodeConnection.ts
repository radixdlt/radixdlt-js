import { BehaviorSubject, Subject } from 'rxjs/Rx'
import { Client } from 'rpc-websockets'

import RadixNode from './RadixNode'

import { RadixAtom, RadixEUID, RadixSerializer } from '../atom_model'

import * as events from 'events'

interface Notification {
    subscriberId: number
}

interface AtomReceivedNotification extends Notification {
    atoms: any[]
}

interface AtomSubmissionStateUpdateNotification extends Notification {
    value: string
    message?: string
}

export declare interface RadixNodeConnection {
    on(event: 'closed', listener: () => void): this
}

export class RadixNodeConnection extends events.EventEmitter {
    private _socket: Client
    private _subscriptions: {
        [subscriberId: number]: Subject<RadixAtom>
    } = {}

    private _atomUpdateSubjects: {
        [subscriberId: number]: BehaviorSubject<any>
    } = {}

    private lastSubscriberId = 0

    public address: string

    constructor(readonly node: RadixNode, readonly port: number) {
        super()
        this.node = node
    }

    private getSubscriberId() {
        this.lastSubscriberId++
        return this.lastSubscriberId
    }

    /**
     * Check whether the node connection is ready for requests
     * @returns true if ready
     */
    public isReady(): boolean {
        return this._socket && this._socket.ready
    }

    /**
     * Opens connection
     * @returns a promise that resolves once the connection is ready, or rejects on error or timeout
     */
    public async openConnection() {
        return new Promise((resolve, reject) => {
            this.address = `wss://${this.node.host.ip}:${this.port}/rpc`
            // this.address = 'ws://127.0.0.1:8080/rpc' //Because this shit be broken right now
            // this.address = 'wss://23.97.209.2:8443/rpc'

            // For testing atom queueing during connection issues
            // if (Math.random() > 0.1) {
            //    this.address += 'garbage'
            // }

            console.log('connecting to ' + this.address)
            this._socket = new Client(this.address, {
                reconnect: false
            })

            this._socket.on('close', this._onClosed)

            this._socket.on('error', error => {
                console.error(error)
                reject(error)
            })

            setTimeout(() => {
                if (!this._socket.ready) {
                    console.warn('Socket timeout')
                    this._socket.close()
                    reject('Timeout')
                }
            }, 5000)

            this._socket.on('open', () => {
                this._socket.on(
                    'Atoms.subscribeUpdate',
                    this._onAtomReceivedNotification
                )
                this._socket.on(
                    'AtomSubmissionState.onNext',
                    this._onAtomSubmissionStateUpdate
                )

                resolve()
            })
        })
    }

    /**
     * Subscribe for all existing and future atoms for a given address
     * @param address base58 formatted address
     * @returns a stream of atoms
     */
    public subscribe(address: string): Subject<RadixAtom> {
        const subscriberId = this.getSubscriberId()
        const subscription = new Subject<RadixAtom>()

        this._subscriptions[subscriberId] = subscription

        this._socket
            .call('Atoms.subscribe', {
                subscriberId,
                query: {
                    destinationAddress: address
                }
                // "debug": true,
            })
            .then((response: any) => {
                console.log('Subscribed for address ' + address, response)
            })
            .catch((error: any) => {
                console.error(error)
                subscription.error(error)
            })

        return subscription
    }

    /**
     * Submit an atom to the ledger
     * @param atom
     * @returns A stream of the status of the atom submission
     */
    public submitAtom(atom: RadixAtom) {
        // Store atom for testing
        // let jsonPath = path.join('./submitAtom.json')
        // console.log(jsonPath)
        // fs.writeFile(jsonPath, JSON.stringify(atom.toJson()), (error) => {
        //    // Throws an error, you could also catch it here
        //    if (error) { throw error }

        //    // Success case, the file was saved
        //    console.log('Atom saved!')
        // })

        const subscriberId = this.getSubscriberId()

        const atomStateSubject = new BehaviorSubject('CREATED')
        this._atomUpdateSubjects[subscriberId] = atomStateSubject

        const timeout = setTimeout(() => {
            this._socket.close()
            atomStateSubject.error('Socket timeout')
        }, 5000)

        this._socket
            .call('Universe.submitAtomAndSubscribe', {
                subscriberId,
                atom: atom.toJson()
            })
            .then(() => {
                clearTimeout(timeout)
                atomStateSubject.next('SUBMITTED')
            })
            .catch((error: any) => {
                clearTimeout(timeout)
                atomStateSubject.error(error)
            })

        return atomStateSubject
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
            .call('Atoms.getAtomInfo', { id: id.toJson() })
            .then((response: any) => {
                return RadixSerializer.fromJson(response.result) as RadixAtom
            })
    }

    public close = () => {
        this._socket.close()
    }

    private _onClosed = () => {
        console.log('Socket closed')

        // Close subject
        for (const subscriberId in this._subscriptions) {
            const subscription = this._subscriptions[subscriberId]
            if (!subscription.closed) {
                subscription.error('Socket closed')
            }
        }

        for (const subscriberId in this._atomUpdateSubjects) {
            const subject = this._atomUpdateSubjects[subscriberId]
            if (!subject.closed) {
                subject.error('Socket closed')
            }
        }

        this.emit('closed')
    }

    private _onAtomSubmissionStateUpdate = (
        notification: AtomSubmissionStateUpdateNotification
    ) => {
        console.log('Atom Submission state update', notification)
        // Handle atom state update
        const subscriberId = notification.subscriberId
        const value = notification.value
        const message = notification.message
        const subject = this._atomUpdateSubjects[subscriberId]

        switch (value) {
            case 'SUBMITTING':
            case 'SUBMITTED':
                subject.next(value)
                break
            case 'STORED':
                subject.next(value)
                subject.complete()
                break
            case 'COLLISION':
            case 'ILLEGAL_STATE':
            case 'UNSUITABLE_PEER':
            case 'VALIDATION_ERROR':
                subject.error(value + ': ' + message)
                break
        }
    }

    private _onAtomReceivedNotification = (
        notification: AtomReceivedNotification
    ) => {
        console.log('Atom received', notification)

        // Store atom for testing
        // let jsonPath = './atomNotification.json'
        // // let jsonPath = path.join(__dirname, '..', '..', '..', '..', 'atomNotification.json')
        // console.log(jsonPath)
        // fs.writeFile(jsonPath, JSON.stringify(notification), (error) => {
        //    // Throws an error, you could also catch it here
        //    if (error) { throw error }

        //    // Success case, the file was saved
        //    console.log('Atom saved!')
        // })

        const deserializedAtoms = RadixSerializer.fromJson(
            notification.atoms
        ) as RadixAtom[]
        console.log(deserializedAtoms)

        // Check HIDs for testing
        for (let i = 0; i < deserializedAtoms.length; i++) {
            const deserializedAtom = deserializedAtoms[i]
            const serializedAtom = notification.atoms[i]

            if (
                serializedAtom.hid &&
                deserializedAtom.hid.equals(
                    RadixEUID.fromJson(serializedAtom.hid)
                )
            ) {
                console.log('HID match')
            } else if (serializedAtom.hid) {
                console.error('HID mismatch')
            }
        }

        // Forward atoms to correct wallets
        const subscription = this._subscriptions[notification.subscriberId]
        for (const atom of deserializedAtoms) {
            subscription.next(atom)
        }
    }
}

export default RadixNodeConnection
