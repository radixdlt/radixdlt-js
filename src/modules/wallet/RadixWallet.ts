import { TSMap } from 'typescript-map'

import { radixApplication } from '../RadixApplication'
import { radixConfig } from '../common/RadixConfig'
import { radixUniverse } from '../universe/RadixUniverse'
import { radixAtomStore } from '../RadixAtomStore'
import { radixToken } from '../token/RadixToken'

import RadixNodeConnection from '../universe/RadixNodeConnection'
import RadixAtom from '../atom/RadixAtom'
import RadixPayloadAtom from '../atom/RadixPayloadAtom'
import RadixMessage from '../messaging/RadixMessage'
import RadixChat from '../messaging/RadixChat'
import RadixTransactionAtom from '../atom/RadixTransactionAtom'
import RadixTransaction from './RadixTransaction'
import RadixConsumer from '../atom/RadixConsumer'
import RadixConsumable from '../atom/RadixConsumable'
import RadixEmission from '../atom/RadixEmission'
import RadixParticle from '../atom/RadixParticle'
import RadixEUID from '../common/RadixEUID'
import RadixECKeyPair from '../atom/RadixECKeyPair'
import RadixKeyPair from './RadixKeyPair'
import RadixTokenClass from '../token/RadixTokenClass'
import RadixSerializer from '../serializer/RadixSerializer'
import RadixApplicationPayloadAtom from '../atom/RadixApplicationPayloadAtom'
import RadixFeeProvider from '../fees/RadixFeeProvider'
import RadixAtomFeeConsumable from '../fees/RadixAtomFeeConsumable'

import { Subject, BehaviorSubject, Observable, Observer } from 'rxjs'

import * as Long from 'long'
import * as events from 'events'

const universe = radixUniverse

export declare interface RadixWallet {
  on(event: 'atom-received:transaction', listener: () => void): this
  on(event: 'atom-received:message', listener: (messages: TSMap<string, RadixChat>) => void): this
  on(event: string, listener: Function): this
}

export class RadixWallet extends events.EventEmitter {

  nodeConnection: RadixNodeConnection
  connectionStatus: BehaviorSubject<string> = new BehaviorSubject('STARTING')
  
  private atomSubscription: Subject<RadixAtom>

  transactionSubject: Subject<RadixTransaction> = new Subject()
  messageSubject: Subject<RadixMessage> = new Subject()
  applicationMessageSubject: Subject<{ applicationId: string, payload: any }> = new Subject()
  balanceSubject: BehaviorSubject<any>

  // TODO: refactor this into separate systems after the atom-model refactor, this file is doing too many things
  transactions: Array<RadixTransaction> = []
  messages: TSMap<string, RadixChat> = new TSMap()
  messageList: Array<RadixMessage> = []
  balance: { [asset_id: string]: number } = {}

  applicationMessages: TSMap<string, Array<{ applicationId: string; payload: any }>> = new TSMap()

  private unspentConsumables: TSMap<string, RadixParticle> = new TSMap()
  private spentConsumables: TSMap<string, RadixParticle> = new TSMap()

  private _atomQueue = []

  constructor(readonly keyPair: RadixKeyPair) {
    super()
  }

  public initialize() {
    this.openNodeConnection()

    this._updateTokens()
    
    // Add default radix token to balance
    this.balance[radixToken.getTokenByISO(radixConfig.mainTokenISO).id.toString()] = 0
    this.balanceSubject = new BehaviorSubject(this.balance)

    this._updateTransactionList()
    this._updateMessageList()
  }

  openNodeConnection = async () => {
    this.connectionStatus.next('CONNECTING')

    try {
      this.nodeConnection = await radixUniverse.getNodeConnection(this.getShard())
      this.connectionStatus.next('CONNECTED')
      this.nodeConnection.on('closed', this._onConnectionClosed)

      // Subscribe to events
      this.atomSubscription = this.nodeConnection.subscribe(this.keyPair.toString())
      this.atomSubscription.subscribe({
        next: this._onAtomReceived,
        error: error => console.error('Subscription error: ' + error),
      })

      this.sendAllQueuedAtoms()
    } catch (error) {
      console.error(error)
      setTimeout(this.openNodeConnection, 1000)
    }
  }

  private _updateTokens() {
    for (let atom of universe.universeConfig.genesis) {
      if (atom.serializer == RadixTokenClass.SERIALIZER) {
        radixToken.addOrUpdateToken(RadixSerializer.fromJson(atom))
      }
    }
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
      // Otherwise put in queue
      this._atomQueue.push(atomSubmission)
    }

    return atomSubmission.promise
  }

  /**
   * Sign an atom
   *
   * @param {RadixAtom} atom
   * @memberof RadixWallet
   */
  signAtom(atom: RadixAtom) {
    const signature = this.keyPair.sign(atom.getHash())
    const signatureId = this.keyPair.getUID()

    atom.signatures = { [signatureId.toString()]: signature }
  }

  /**
   * Decrypt a payload atom
   *
   * @param {RadixPayloadAtom} atom The atom to be decrypted
   * @returns {any}
   * @memberof RadixWallet
   */
  decryptAtom(atom: RadixPayloadAtom): any {
    let payload = ''
    
    try {
      payload = atom.getDecryptedPayload(this.keyPair)
    } catch (error) {
      console.log(error)
    }

    return payload
  }

  async sendAtom(atomSubmission) {
    console.log('Generating POW fee')
    
    // Fees
    const atom = atomSubmission.atom

    // Remove existing fee consumables
    for (let i = atom.particles.length - 1; i >= 0; i--) {
      if (atom.particles[i].serializer === RadixAtomFeeConsumable.SERIALIZER) {
        atom.particles.splice(i, 1)
      }
    }

    const powFeeConsumable = await RadixFeeProvider.generatePOWFee(
      universe.universeConfig.getMagic(),
      radixToken.getTokenByISO('POW'),
      atom,
      this.nodeConnection
    )

    console.log('POW Fee generated')

    atom.particles.push(powFeeConsumable)

    // Sign
    this.signAtom(atom)

    // Submit
    console.log('Submitting atom', atom)
    
    const subject = this.nodeConnection.submitAtom(atom)

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
    token_id: string,
    message?: string
  ) {
    if (isNaN(decimalQuantity)) {
      throw new Error('Amount is not a valid number')
    }
    if (!radixToken.getCurrentTokens()[token_id]) {
      throw new Error(`Invalid token id ${token_id}`)
    }

    let token = radixToken.getTokenByID(token_id)

    let to = RadixKeyPair.fromAddress(address)
    let quantity = token.toToken(decimalQuantity)

    console.log(decimalQuantity, quantity, token.sub_units)

    if (quantity < 0) {
      throw new Error('Cannot send negative amount')
    } else if (quantity === 0 && decimalQuantity > 0) {
      const decimalPlaces = Math.log10(token.sub_units)
      throw new Error(`You can only specify up to ${decimalPlaces} decimal places`)
    } else if (quantity === 0 && decimalQuantity === 0) {
      throw new Error(`Cannot send 0`)
    }

    if (quantity > this.balance[token_id]) {
      throw new Error('Insufficient funds')
    }

    let particles: Array<RadixParticle> = []
    let consumerQuantity = 0
    for (let [id, consumable] of this.unspentConsumables.entries()) {
      if ((consumable as RadixConsumable).asset_id.toString() != token_id) {
        continue
      }

      let consumer = new RadixConsumer(consumable as object)
      particles.push(consumer)

      consumerQuantity += consumer.quantity
      if (consumerQuantity >= quantity) {
        break
      }
    }

    // Create consumables

    const recipientConsumable = new RadixConsumable()
    recipientConsumable.asset_id = token.id
    recipientConsumable.quantity = quantity
    recipientConsumable.destinations = [to.getUID()]
    recipientConsumable.nonce = Date.now()
    recipientConsumable.owners = [RadixECKeyPair.fromRadixKeyPair(to)]

    particles.push(recipientConsumable)

    if (consumerQuantity - quantity > 0) {
      const reminderConsumable = new RadixConsumable()
      reminderConsumable.asset_id = token.id
      reminderConsumable.quantity = consumerQuantity - quantity
      reminderConsumable.destinations = [this.keyPair.getUID()]
      reminderConsumable.nonce = Date.now()
      reminderConsumable.owners = [RadixECKeyPair.fromRadixKeyPair(this.keyPair)]

      particles.push(reminderConsumable)
    }

    // Build the atom
    const atom = new RadixTransactionAtom()

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
    const payload = {
      to: toKeyPair.getAddress(),
      from: this.keyPair.getAddress(),
      content: message
    }
    const recipients = [this.keyPair, toKeyPair]

    const atom = RadixApplicationPayloadAtom.withEncryptedPayload(
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

    for (let address of to) {
      recipients.push(RadixKeyPair.fromAddress(address))
    }

    const atom = RadixApplicationPayloadAtom.withEncryptedPayload(
      payload,
      recipients,
      applicationId,
      encrypted
    )
    atom.particles = []

    return this.sendOrQueueAtom(atom)
  }

  private _onAtomReceived = (atom: RadixAtom) => {
    // Store in DB
    radixAtomStore.storeAtom(atom).then(atom => {
      if (atom && atom.serializer == RadixApplicationPayloadAtom.SERIALIZER) {
        if ((atom as RadixApplicationPayloadAtom).applicationId == 'radix-messaging') {
          this._addAtomToMessageList(atom as RadixApplicationPayloadAtom)
        } else {
          this._addAtomToApplicationMessages(atom as RadixApplicationPayloadAtom)
        }
      } else if (atom && atom.serializer == RadixTransactionAtom.SERIALIZER) {
        this._addAtomToTransactionList(atom as RadixTransactionAtom)
      }
    })
  }

  private _onConnectionClosed = () => {
    // Get a new one
    this.openNodeConnection()
  }

  private _updateTransactionList = () => {
    const that = this

    // query atomstore
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
      message: this.decryptAtom(atom)
    }

    for (const particle of atom.particles as Array<RadixConsumer | RadixConsumable | RadixEmission>) {
      const token_id = particle.asset_id.toString()
      if (!radixToken.getCurrentTokens()[token_id]) {
        const token = await this.nodeConnection.getAtomById(new RadixEUID(token_id))
        radixToken.addOrUpdateToken(token)
      }

      let ownedByMe = false
      for (const owner of particle.owners) {
        if (owner.public.data.equals(this.keyPair.getPublic())) {
          ownedByMe = true
          break
        }
      }

      const isFee = particle.serializer === RadixAtomFeeConsumable.SERIALIZER

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

        // console.log(this.unspentConsumables)

        if (!(token_id in transaction.balance)) {
          transaction.balance[token_id] = 0
        }
        transaction.balance[token_id] += quantity
      } else if (!ownedByMe && !isFee) {
        for (const owner of particle.owners) {
          const keyPair = RadixKeyPair.fromRadixECKeyPair(owner)
          transaction.participants[keyPair.getAddress()] = keyPair.getAddress()

          // Add to contacts
          // this.addContact(keyPair)
        }
      }
    }

    this.transactions.push(transaction)

    // Update balance and assets
    for (const token_id in transaction.balance) {
      if (!(token_id in this.balance)) {
        this.balance[token_id] = 0
      }

      this.balance[token_id] += transaction.balance[token_id]
    }

    // console.log(this.transactions, this.balance)

    radixApplication.emit('atom-received:transaction', transaction, notify)

    this.balanceSubject.next(this.balance)
    this.transactionSubject.next(transaction)
  }

  private _updateMessageList = () => {
    const that = this

    // query atomstore
    radixAtomStore.getAtoms(RadixApplicationPayloadAtom).then(atoms => {
      atoms.sort(RadixAtom.compare).forEach(atom => {
        setTimeout(() => {
          if ((atom as RadixApplicationPayloadAtom).applicationId == 'radix-messaging') {
            that._addAtomToMessageList(atom as RadixApplicationPayloadAtom, false)
          } else {
            that._addAtomToApplicationMessages(atom as RadixApplicationPayloadAtom)
          }
        }, 0)
      })
    })
  }

  private _addAtomToMessageList(
    atom: RadixApplicationPayloadAtom,
    notify: boolean = true
  ) {
    // Format message
    let payload = this.decryptAtom(atom)

    // TODO: check owner

    const to = RadixKeyPair.fromAddress(payload.to)
    const from = RadixKeyPair.fromAddress(payload.from)

    // Chat id
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

    const chatId = address.toString()

    const message: RadixMessage = {
      atom_hid: atom.hid,
      chat_id: chatId,
      to: to,
      from: from,
      content: payload.content,
      timestamp: atom.timestamps.default,
      is_mine: isMine
    }

    // Find existing chat
    // Otherwise create new chat
    if (!this.messages.has(chatId)) {
      const chatDescription: RadixChat = {
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

    // Move chat to the top
    this.messages.delete(chatId)
    this.messages.set(chatId, chatDescription)

    this.messageList.push(message)

    radixApplication.emit('atom-received:message', message, notify)
    this.messageSubject.next(message)

    // Add the other person to contacts
    // this.addContact(address)
  }

  private _addAtomToApplicationMessages(atom: RadixApplicationPayloadAtom) {
    const applicationMessage = {
      payload: this.decryptAtom(atom),
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
          for (let applicationMessage of this.applicationMessages.get( applicationId)) {
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
