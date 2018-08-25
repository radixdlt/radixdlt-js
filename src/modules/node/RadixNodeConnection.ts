import RadixNode from './RadixNode'
import RadixSerializer from '../serializer/RadixSerializer'
import RadixAtom from '../atom/RadixAtom'
import * as fs from 'fs'
import * as path from 'path'
import RadixEUID from '../common/RadixEUID'
import RadixKeyPair from '../wallet/RadixKeyPair'
import { BehaviorSubject } from 'rxjs-compat'
import { Client } from 'rpc-websockets'

interface AtomReceiver {
  address: RadixKeyPair
  onNotification: Function
  onClosed: Function
}

interface Notification {
  subscriberId: number
}

interface AtomReceivedNotification extends Notification {
  atoms: Array<any>
}

interface AtomSubmissionStateUpdateNotification extends Notification {
  value: string
  message?: string
}

export default class RadixNodeConnection {
  private _socket: Client
  private _atomReceivers: Array<AtomReceiver> = []
  private _atomUpdateSubjects: {
    [subscriberId: number]: BehaviorSubject<any>
  } = {}

  public address: string
  public node: RadixNode

  constructor(node: RadixNode) {
    this.node = node
  }

  isReady() {
    return this._socket && this._socket.ready
  }

  async openConnection() {
    return new Promise((resolve, reject) => {
      this.address = `wss://${this.node.host.ip}:443/rpc`
      // this.address = 'ws://127.0.0.1:8080/rpc' //Because this shit be broken right now
      // this.address = 'wss://23.97.209.2:8443/rpc'

      // For testing atom queueing during connection issues
      // if (Math.random() > 0.1) {
      //     this.address += 'garbage'
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

  subscribe(
    address: RadixKeyPair,
    onNotification: Function,
    onClosed: Function
  ) {
    this._atomReceivers.push({ address, onNotification, onClosed })

    this._socket
      .call('Atoms.subscribe', {
        subscriberId: this._atomReceivers.length,
        query: {
          destinationAddress: address.toString()
        }
        // "debug": true,
      })
      .then((response: any) => {
        console.log('Subscribed for address ' + address, response)
      })
      .catch((err: any) => {
        console.log(err)
      })
  }

  sendAtom(atom: RadixAtom) {
    // Store atom for testing
    // let jsonPath = path.join('./submitAtom.json')
    // console.log(jsonPath)
    // fs.writeFile(jsonPath, JSON.stringify(atom.toJson()), (err) => {
    //     // throws an error, you could also catch it here
    //     if (err) { throw err }

    //     // success case, the file was saved
    //     console.log('Atom saved!')
    // })

    let subscriberId = Date.now() //TODO: is this good enough?

    let atomStateSubject = new BehaviorSubject('CREATED')
    this._atomUpdateSubjects[subscriberId] = atomStateSubject

    const timeout = setTimeout(() => {
      this._socket.close()
      atomStateSubject.error('Socket timeout')
    }, 5000)

    this._socket
      .call('Universe.submitAtomAndSubscribe', {
        subscriberId: subscriberId,
        atom: atom.toJson()
      })
      .then((response: any) => {
        clearTimeout(timeout)
        atomStateSubject.next('SUBMITTED')
      })
      .catch((error: any) => {
        clearTimeout(timeout)
        atomStateSubject.error(error)
      })

    return atomStateSubject
  }

  public async getAtomById(id: RadixEUID) {
    // TODO
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
    // Notify wallets

    for (let atomReceiver of this._atomReceivers) {
      atomReceiver.onClosed()
    }
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
    // fs.writeFile(jsonPath, JSON.stringify(notification), (err) => {
    //     // throws an error, you could also catch it here
    //     if (err) { throw err }

    //     // success case, the file was saved
    //     console.log('Atom saved!')
    // })

    let deserializedAtoms = RadixSerializer.fromJson(
      notification.atoms
    ) as Array<RadixAtom>
    console.log(deserializedAtoms)

    // Check HIDs for testing
    for (let i = 0; i < deserializedAtoms.length; i++) {
      let deserializedAtom = deserializedAtoms[i]
      let serializedAtom = notification.atoms[i]

      if (
        serializedAtom.hid &&
        deserializedAtom.hid.equals(RadixEUID.fromJson(serializedAtom.hid))
      ) {
        console.log('HID match')
      } else if (serializedAtom.hid) {
        console.error('HID mismatch')
      }
    }

    // Forward atoms to correct wallets
    for (const atomReceiver of this._atomReceivers) {
      for (const atom of deserializedAtoms) {
        for (let i = 0; i < atom.destinations.length; i++) {
          if (atom.destinations[i].equals(atomReceiver.address.getUID())) {
            // console.log('Found destination match')
            setTimeout(() => {
              atomReceiver.onNotification(atom)
            }, 0)
            break
          }
        }
      }
    }
  }
}
