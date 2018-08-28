import { radixNodeManager } from '../node/RadixNodeManager'
import { radixAtomStore } from '../RadixAtomStore'

import RadixNodeConnection from '../node/RadixNodeConnection'
import RadixAtom from '../atom/RadixAtom'
import { TSMap } from 'typescript-map'
import RadixMessage from '../messaging/RadixMessage'
import RadixChat from '../messaging/RadixChat'
import * as events from 'events'
import * as fs from 'fs-extra'

import * as EC from 'elliptic'
import RadixTransactionAtom from '../atom/RadixTransactionAtom'
import RadixTransaction from './RadixTransaction'
import RadixConsumer from '../atom/RadixConsumer'
import RadixConsumable from '../atom/RadixConsumable'
import RadixEmission from '../atom/RadixEmission'
import RadixParticle from '../atom/RadixParticle'
import { radixApplication } from '../RadixApplication'
import RadixEUID from '../common/RadixEUID'
import RadixECKeyPair from '../atom/RadixECKeyPair'
import RadixKeyPair from './RadixKeyPair'

const ec = new EC.ec('secp256k1')

import RadixAsset from '../assets/RadixAsset'
import RadixSerializer from '../serializer/RadixSerializer'
import RadixContact from '../contacts/RadixContact'
import RadixApplicationPayloadAtom from '../atom/RadixApplicationPayloadAtom'
import * as Long from 'long'
import RadixFeeProvider from '../fees/RadixFeeProvider'
import RadixAtomFeeConsumable from '../fees/RadixAtomFeeConsumable'
import { radixConfig } from '../common/RadixConfig'
import { Subject, BehaviorSubject, Observable, Observer } from 'rxjs'

import { radixUniverse } from './RadixUniverse'
import { resolve } from 'path'
const universe = radixUniverse

export declare interface RadixWallet {
  on(event: 'atom-received:transaction', listener: () => void): this
  on(
    event: 'atom-received:message',
    listener: (messages: TSMap<string, RadixChat>) => void
  ): this
  on(event: string, listener: Function): this
}

export class RadixWallet extends events.EventEmitter {
  nodeConnection: RadixNodeConnection

  connectionStatus: BehaviorSubject<string> = new BehaviorSubject('STARTING')

  transactionSubject: Subject<RadixTransaction> = new Subject()
  messageSubject: Subject<RadixMessage> = new Subject()
  applicationMessageSubject: Subject<{
    applicationId: string
    payload: any
  }> = new Subject()
  balanceSubject: BehaviorSubject<any>

  //TODO: refactor this into separate systems after the atom-model refactor, this file is doing too many things
  balance: { [asset_id: string]: number } = {}
  assets: { [id: string]: RadixAsset } = {}
  transactions: Array<RadixTransaction> = []
  messages: TSMap<string, RadixChat> = new TSMap()
  messageList: Array<RadixMessage> = []

  applicationMessages: TSMap<
    string,
    Array<{ applicationId: string; payload: any }>
  > = new TSMap()

  contacts: { [address: string]: RadixContact } = {}

  private unspentConsumables: TSMap<string, RadixParticle> = new TSMap()
  private spentConsumables: TSMap<string, RadixParticle> = new TSMap()

  private _atomQueue = []

  constructor(readonly keyPair: RadixKeyPair) {
    super()
  }

  initialize() {
    this.openNodeConnection()

    this._updateAssets()
    //Add default radix asset to balance
    this.balance[this.getAssetByISO(radixConfig.mainAssetISO).id.toString()] = 0
    this.balanceSubject = new BehaviorSubject(this.balance)

    //Add default contacts
    this.addContact(radixConfig.faucetAddress, 'Faucet')

    this.loadContacts()
    this._updateTransactionList()
    this._updateMessageList()
  }

  openNodeConnection = async () => {
    this.connectionStatus.next('CONNECTING')

    try {
      this.nodeConnection = await radixNodeManager.getNodeConnection(
        this.getShard()
      )

      this.connectionStatus.next('CONNECTED')

      //Subscribe to events
      this.nodeConnection.subscribe(
        this.keyPair,
        this._onAtomReceived,
        this._onConnectionClosed
      )

      this.sendAllQueuedAtoms()
    } catch (err) {
      console.error(err)
      setTimeout(this.openNodeConnection, 1000)
    }
  }

  private _updateAssets() {
    for (let atom of universe.genesis) {
      if (atom.serializer == RadixAsset.SERIALIZER) {
        let deserializedAtom = RadixSerializer.fromJson(atom)
        this.assets[deserializedAtom.id] = deserializedAtom
      }
    }
  }

  private getAssetByISO(iso: string) {
    for (let id in this.assets) {
      if (this.assets[id].iso === iso) {
        return this.assets[id]
      }
    }

    return null
  }

  getShard(): Long {
    return this.keyPair.getShard()
  }

  sendAllQueuedAtoms() {
    while (this._atomQueue.length > 0) {
      this.sendAtom(this._atomQueue.shift())
    }
  }

  sendOrQueueAtom(atom: RadixAtom): Promise<RadixAtom> {
    const atomSubmission = {
      atom: atom,
      promise: null,
      resolve: null,
      reject: null
    }

    atomSubmission.promise = new Promise((resolve, reject) => {
      atomSubmission.resolve = resolve
      atomSubmission.reject = reject
    })

    if (this.nodeConnection && this.nodeConnection.isReady()) {
      this.sendAtom(atomSubmission)
    } else {
      //Otherwise put in queue
      this._atomQueue.push(atomSubmission)
    }

    return atomSubmission.promise
  }

  async sendAtom(atomSubmission) {
    //Fees
    console.log('Generating POW fee')
    const atom = atomSubmission.atom

    //Remove existing fee consumables
    for (let i = atom.particles.length - 1; i >= 0; i--) {
      if (atom.particles[i].serializer === RadixAtomFeeConsumable.SERIALIZER) {
        atom.particles.splice(i, 1)
      }
    }

    const powFeeConsumable = await RadixFeeProvider.generatePOWFee(
      universe.getMagic(),
      this.getAssetByISO('POW'),
      atom,
      this.nodeConnection
    )
    console.log('POW Fee generated')
    atom.particles.push(powFeeConsumable)

    //Sign
    let signatureId = this.keyPair.getUID()
    let hash = atom.getHash()
    let signature = this.keyPair.sign(hash)

    atom.signatures = { [signatureId.toString()]: signature }

    //Submit
    console.log('Submitting atom', atom)
    let subject = this.nodeConnection.sendAtom(atom)

    subject.subscribe({
      next: value => {
        console.log(value)
      },
      error: error => {
        console.error(error)
        console.log('Resubmitting atom')
        this._atomQueue.push(atomSubmission)
      },
      complete: () => {
        atomSubmission.resolve(atom)
        this._onAtomReceived(atom)
      }
    })
  }

  async sendTransaction(
    address: string,
    decimalQuantity: number,
    asset_id: string,
    message?: string
  ) {
    if (isNaN(decimalQuantity)) {
      throw new Error('Amount is not a valid number')
    }

    if (!(asset_id in this.assets)) {
      throw new Error('Invalid asset id ' + asset_id)
    }

    let asset = this.assets[asset_id]
    let to = RadixKeyPair.fromAddress(address)

    let quantity = asset.toAsset(decimalQuantity)
    console.log(decimalQuantity, quantity, asset.sub_units)

    if (quantity < 0) {
      throw new Error('Cannot send negative amount')
    } else if (quantity === 0 && decimalQuantity > 0) {
      const decimalPlaces = Math.log10(asset.sub_units)
      throw new Error(
        `You can only specify up to ${decimalPlaces} decimal places`
      )
    } else if (quantity === 0 && decimalQuantity === 0) {
      throw new Error(`Cannot send 0`)
    }

    if (quantity > this.balance[asset_id]) {
      throw new Error('Insufficient funds')
    }

    let particles: Array<RadixParticle> = []
    let consumerQuantity = 0
    for (let [id, consumable] of this.unspentConsumables.entries()) {
      if ((consumable as RadixConsumable).asset_id.toString() != asset_id) {
        continue
      }

      let consumer = new RadixConsumer(consumable as object)
      particles.push(consumer)

      consumerQuantity += consumer.quantity
      if (consumerQuantity >= quantity) {
        break
      }
    }

    //Create consumables

    let recipientConsumable = new RadixConsumable()
    recipientConsumable.asset_id = asset.id
    recipientConsumable.quantity = quantity
    recipientConsumable.destinations = [to.getUID()]
    recipientConsumable.nonce = Date.now()
    recipientConsumable.owners = [RadixECKeyPair.fromRadixKeyPair(to)]

    particles.push(recipientConsumable)

    if (consumerQuantity - quantity > 0) {
      let reminderConsumable = new RadixConsumable()
      reminderConsumable.asset_id = asset.id
      reminderConsumable.quantity = consumerQuantity - quantity
      reminderConsumable.destinations = [this.keyPair.getUID()]
      reminderConsumable.nonce = Date.now()
      reminderConsumable.owners = [
        RadixECKeyPair.fromRadixKeyPair(this.keyPair)
      ]

      particles.push(reminderConsumable)
    }

    //Build the atom
    let atom = new RadixTransactionAtom()

    atom.action = 'STORE'
    atom.operation = 'TRANSFER'
    atom.particles = particles
    atom.destinations = [this.keyPair.getUID(), to.getUID()]
    atom.timestamps = { default: Date.now() }

    if (message) {
      atom.addEncryptedPayload(message, [this.keyPair, to])
    }

    return this.sendOrQueueAtom(atom)
  }

  async sendMessage(to: string, message: string) {
    const toKeyPair = RadixKeyPair.fromAddress(to)

    let payload = {
      to: toKeyPair.getAddress(),
      from: this.keyPair.getAddress(),
      content: message
    }

    let recipients = [this.keyPair, toKeyPair]

    let atom = RadixApplicationPayloadAtom.withEncryptedPayload(
      payload,
      recipients,
      'radix-messaging'
    )

    atom.particles = []

    return this.sendOrQueueAtom(atom)
  }

  async sendApplicationMessage(
    to: Array<string>,
    payload: any,
    applicationId: string,
    encrypted = true
  ) {
    const recipients = []
    recipients.push(this.keyPair)

    for (const address of to) {
      recipients.push(RadixKeyPair.fromAddress(address))
    }

    let atom = RadixApplicationPayloadAtom.withEncryptedPayload(
      payload,
      recipients,
      applicationId,
      encrypted
    )

    atom.particles = []

    return this.sendOrQueueAtom(atom)
  }

  private _onAtomReceived = (atom: RadixAtom) => {
    //Store in DB
    radixAtomStore.storeAtom(atom).then(atom => {
      if (atom && atom.serializer == RadixApplicationPayloadAtom.SERIALIZER) {
        if (
          (atom as RadixApplicationPayloadAtom).applicationId ==
          'radix-messaging'
        ) {
          this._addAtomToMessageList(atom as RadixApplicationPayloadAtom)
        } else {
          this._addAtomToApplicationMessages(
            atom as RadixApplicationPayloadAtom
          )
        }
      } else if (atom && atom.serializer == RadixTransactionAtom.SERIALIZER) {
        this._addAtomToTransactionList(atom as RadixTransactionAtom)
      }
    })
  }

  private _onConnectionClosed = () => {
    //Get a new one
    this.openNodeConnection()
  }

  private _updateTransactionList = () => {
    let that = this

    //query atomstore
    radixAtomStore.getAtoms(RadixTransactionAtom).then(atoms => {
      atoms.sort(RadixAtom.compare).forEach(atom => {
        setTimeout(() => {
          that._addAtomToTransactionList(atom as RadixTransactionAtom, false)
        }, 0)
      })
    })
  }

  private _addAtomToTransactionList = async (
    atom: RadixTransactionAtom,
    notify: boolean = true
  ) => {
    const transaction: RadixTransaction = {
      balance: {},
      fee: 0,
      participants: {},
      timestamp: atom.timestamps.default,
      message: ''
    }

    try {
      transaction.message = atom.getDecryptedPayload(this.keyPair)
    } catch (e) {
      // console.log(e)
    }

    for (const particle of atom.particles as Array<
      RadixConsumer | RadixConsumable | RadixEmission
    >) {
      let asset_id = particle.asset_id.toString()
      if (!(asset_id in this.assets)) {
        this.assets[asset_id] = await this.nodeConnection.getAtomById(
          new RadixEUID(asset_id)
        )
      }
      let asset = this.assets[asset_id]

      let ownedByMe = false
      for (const owner of particle.owners) {
        if (owner.public.data.equals(this.keyPair.getPublic())) {
          ownedByMe = true
          break
        }
      }

      let isFee = particle.serializer === RadixAtomFeeConsumable.SERIALIZER

      if (ownedByMe && !isFee) {
        let quantity = 0
        if (particle.serializer === RadixConsumer.SERIALIZER) {
          quantity -= particle.quantity

          this.unspentConsumables.delete(particle._id)
          this.spentConsumables.set(particle._id, particle)
        } else if (
          particle.serializer === RadixConsumable.SERIALIZER ||
          particle.serializer === RadixEmission.SERIALIZER
        ) {
          quantity += particle.quantity

          if (!this.spentConsumables.has(particle._id)) {
            this.unspentConsumables.set(particle._id, particle)
          }
        }
        //console.log(this.unspentConsumables)

        if (!(asset_id in transaction.balance)) {
          transaction.balance[asset_id] = 0
        }
        transaction.balance[asset_id] += quantity
      } else if (!ownedByMe && !isFee) {
        for (const owner of particle.owners) {
          const keyPair = RadixKeyPair.fromRadixECKeyPair(owner)
          transaction.participants[keyPair.getAddress()] = keyPair.getAddress()

          //Add to contacts
          this.addContact(keyPair)
        }
      }
    }

    this.transactions.push(transaction)

    //Update balance and assets
    for (const asset_id in transaction.balance) {
      if (!(asset_id in this.balance)) {
        this.balance[asset_id] = 0
      }

      this.balance[asset_id] += transaction.balance[asset_id]
    }

    // console.log(this.transactions, this.balance)

    radixApplication.emit('atom-received:transaction', transaction, notify)

    this.balanceSubject.next(this.balance)
    this.transactionSubject.next(transaction)
  }

  private _updateMessageList = () => {
    let that = this

    //query atomstore
    radixAtomStore.getAtoms(RadixApplicationPayloadAtom).then(atoms => {
      atoms.sort(RadixAtom.compare).forEach(atom => {
        setTimeout(() => {
          if (
            (atom as RadixApplicationPayloadAtom).applicationId ==
            'radix-messaging'
          ) {
            that._addAtomToMessageList(
              atom as RadixApplicationPayloadAtom,
              false
            )
          } else {
            that._addAtomToApplicationMessages(
              atom as RadixApplicationPayloadAtom
            )
          }
        }, 0)
      })
    })
  }

  private _addAtomToMessageList(
    atom: RadixApplicationPayloadAtom,
    notify: boolean = true
  ) {
    //Format message
    let payload = atom.getDecryptedPayload(this.keyPair)

    //TODO: Check owner

    const to = RadixKeyPair.fromAddress(payload.to)
    const from = RadixKeyPair.fromAddress(payload.from)

    //Chat id
    let address = null
    let isMine = false

    if (from.equals(this.keyPair)) {
      address = to
      isMine = true
    } else if (to.equals(this.keyPair)) {
      address = from
    }

    if (address == null) {
      throw new Error('Problem with addresses')
    }

    let chatId = address.toString()

    let message: RadixMessage = {
      atom_hid: atom.hid,
      chat_id: chatId,
      to: to,
      from: from,
      content: payload.content,
      timestamp: atom.timestamps.default,
      is_mine: isMine
    }

    //Find existing chat
    //Otherwise create new chat
    if (!this.messages.has(chatId)) {
      let chatDescription: RadixChat = {
        address: address.getAddress(),
        chat_id: chatId,
        title: chatId,
        last_message_timestamp: message.timestamp,
        messages: []
      }

      this.messages.set(chatId, chatDescription)
    }

    let chatDescription = this.messages.get(chatId)
    if (message.timestamp > chatDescription.last_message_timestamp) {
      chatDescription.last_message_timestamp = message.timestamp
    }
    chatDescription.messages.push(message)

    //Move chat to the top
    this.messages.delete(chatId)
    this.messages.set(chatId, chatDescription)

    this.messageList.push(message)

    radixApplication.emit('atom-received:message', message, notify)
    this.messageSubject.next(message)

    //Add the other person to contacts
    this.addContact(address)
  }

  private _addAtomToApplicationMessages(atom: RadixApplicationPayloadAtom) {
    const applicationMessage = {
      payload: atom.getDecryptedPayload(this.keyPair),
      applicationId: atom.applicationId
    }

    if (!this.applicationMessages.has(applicationMessage.applicationId)) {
      this.applicationMessages.set(applicationMessage.applicationId, [])
    }

    this.applicationMessages
      .get(applicationMessage.applicationId)
      .push(applicationMessage)

    this.applicationMessageSubject.next(applicationMessage)
  }

  public startNewChat(address: string) {
    //Parse and check address for validity
    let to = RadixKeyPair.fromAddress(address)

    //Create new chat
    let chatId = address
    let chatDescription: RadixChat = {
      address: to.getAddress(),
      chat_id: chatId,
      title: chatId.slice(0, 10) + '...',
      last_message_timestamp: Date.now(),
      messages: []
    }

    //Add at the top
    this.messages.set(chatId, chatDescription)

    radixApplication.emit('atom-received:message')

    this.addContact(to)
  }

  public addContact(
    address: string | RadixKeyPair | RadixECKeyPair,
    alias: string = null
  ) {
    if (typeof address == 'string') {
      address = RadixKeyPair.fromAddress(address)
    } else if (address instanceof RadixECKeyPair) {
      address = RadixKeyPair.fromRadixECKeyPair(address)
    }

    if (address.getAddress() in this.contacts) {
      return
    }

    if (alias === null) {
      alias = address.getAddress()
    }

    const contact = {
      keyPair: address,
      address: address.getAddress(),
      alias: alias
    }

    this.contacts[address.getAddress()] = contact

    radixApplication.emit('contact-added')

    // this.saveContacts()
  }

  public async saveContacts() {
    //Need a filename and encryption key
    radixConfig.contactsFileName

    const serializedContacts = []
    for (const address in this.contacts) {
      serializedContacts.push({
        address: address,
        alias: this.contacts[address].alias
      })
    }

    //TODO: Encrypt
    await fs.writeJson(radixConfig.contactsFileName, serializedContacts)
  }

  public async loadContacts() {
    try {
      const serializedContacts = await fs.readJson(radixConfig.contactsFileName)

      //Merge with contacts list
      for (let contact of serializedContacts) {
        if (contact.address in this.contacts) {
          this.contacts[contact.address].alias = contact.alias
          radixApplication.emit('contact-added')
        } else {
          this.addContact(contact.address, contact.alias)
        }
      }
    } catch (error) {
      console.log(error)
    }
  }

  getAllTransactions(): Observable<RadixTransaction> {
    console.log('subscribing to transactions')
    return Observable.create((observer: Observer<RadixTransaction>) => {
      // Send all old transactions
      for (let transaction of this.transactions) {
        observer.next(transaction)
      }

      // Subscribe for new ones
      this.transactionSubject.subscribe(observer)
    })
  }

  getAllMessages(): Observable<RadixMessage> {
    return Observable.create((observer: Observer<RadixMessage>) => {
      // Send all old messages
      for (let message of this.messageList) {
        observer.next(message)
      }

      // Subscribe for new ones
      this.messageSubject.subscribe(observer)
    })
  }

  getApplicationMessages(
    applicationId: string
  ): Observable<{ applicationId: string; payload: any }> {
    return Observable.create(
      (observer: Observer<{ applicationId: string; payload: any }>) => {
        // Send all old messages
        if (this.applicationMessages.has(applicationId)) {
          for (let applicationMessage of this.applicationMessages.get(
            applicationId
          )) {
            observer.next(applicationMessage)
          }
        }

        // Subscribe for new ones
        this.applicationMessageSubject.filter(applicationMessage => {
          return applicationMessage.applicationId === applicationId
        })
      }
    )
  }
}

export default RadixWallet
