import { BehaviorSubject, Subject } from 'rxjs/Rx'
import { Client } from 'rpc-websockets'

import RadixNode from './RadixNode'

import { RadixAtom, RadixEUID, RadixSerializer, RadixAtomUpdate } from '../RadixAtomModel'
import { logger } from '../common/RadixLogger'

import events from 'events'

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
    on(event: 'closed' | 'open', listener: () => void): this
}

export class RadixNodeConnection extends events.EventEmitter {
    private pingInterval
    private _socket: Client
    private _subscriptions: {
        [subscriberId: number]: Subject<RadixAtomUpdate>,
    } = {}

    private _atomUpdateSubjects: {
        [subscriberId: number]: BehaviorSubject<any>
    } = {}

    private lastSubscriberId = 1

    public address: string

    constructor(readonly node: RadixNode, readonly nodeRPCAddress: (nodeIp: string) => string) {
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

    private ping = () => {
        if (this.isReady()) {
            this._socket
            .call('Network.getSelf', { id: 0 }).then((response: any) => {
                logger.debug(`Ping`, response)
            })
        }
    }

    /**
     * Opens connection
     * @returns a promise that resolves once the connection is ready, or rejects on error or timeout
     */
    public async openConnection() {
        return new Promise((resolve, reject) => {
            this.address = this.nodeRPCAddress(this.node.host.ip)

            // For testing atom queueing during connection issues
            // if (Math.random() > 0.1) {
            //    this.address += 'garbage'
            // }

            logger.info(`Connecting to ${this.address}`)
            this._socket = new Client(this.address, {
                reconnect: false
            })

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
                this.pingInterval = setInterval(this.ping, 10000)

                this.emit('open')

                this._socket.on(
                    'Atoms.subscribeUpdate',
                    this._onAtomReceivedNotification,
                )
                this._socket.on(
                    'AtomSubmissionState.onNext',
                    this._onAtomSubmissionStateUpdate,
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
    public subscribe(address: string): Subject<RadixAtomUpdate> {
        const subscriberId = this.getSubscriberId()
        const subscription = new Subject<RadixAtomUpdate>()

        this._subscriptions[subscriberId] = subscription

        this._socket
            .call('Atoms.subscribe', {
                subscriberId,
                query: {
                    destinationAddress: address,
                },
                // "debug": true,
            })
            .then((response: any) => {
                logger.info(`Subscribed for address ${address}`, response)
            })
            .catch((error: any) => {
                logger.error(error)
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
        // logger.info(jsonPath)
        // fs.writeFile(jsonPath, JSON.stringify(atom.toJson()), (error) => {
        //    // Throws an error, you could also catch it here
        //    if (error) { throw error }

        //    // Success case, the file was saved
        //    logger.info('Atom saved!')
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
        logger.info('Socket closed')

        clearInterval(this.pingInterval)

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
        notification: AtomSubmissionStateUpdateNotification,
    ) => {
        logger.info('Atom Submission state update', notification)
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
        logger.info('Atom received', notification)

        // Store atom for testing
        // let jsonPath = './atomNotification.json'
        // // let jsonPath = path.join(__dirname, '..', '..', '..', '..', 'atomNotification.json')
        // logger.info(jsonPath)
        // fs.writeFile(jsonPath, JSON.stringify(notification), (error) => {
        //    // Throws an error, you could also catch it here
        //    if (error) { throw error }

        //    // Success case, the file was saved
        //    logger.info('Atom saved!')
        // })

        const deserializedAtoms = RadixSerializer.fromJson(
            notification.atoms
        ) as RadixAtom[]
        logger.info(deserializedAtoms)

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
                logger.info('HID match')
            } else if (serializedAtom.hid) {
                logger.error('HID mismatch')
            }
        }

        // Forward atoms to correct wallets
        const subscription = this._subscriptions[notification.subscriberId]
        for (const atom of deserializedAtoms) {
            subscription.next({ // This is a temporary solution, in future nodes will return AtomUpdates rather than just Atoms
                action: 'STORE',
                atom,
            })
        }
    }
}

export default RadixNodeConnection
