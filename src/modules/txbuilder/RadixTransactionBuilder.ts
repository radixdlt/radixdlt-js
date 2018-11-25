import { BehaviorSubject } from 'rxjs'

import RadixSignatureProvider from '../identity/RadixSignatureProvider'
import RadixAccount from '../account/RadixAccount'
import RadixTransferAccountSystem from '../account/RadixTransferAccountSystem'
import RadixFeeProvider from '../fees/RadixFeeProvider'

import { radixUniverse } from '../universe/RadixUniverse'
import { radixTokenManager } from '../..'
import { RadixNodeConnection } from '../universe/RadixNodeConnection'
import {
    RadixApplicationPayloadAtom,
    RadixAtom,
    RadixConsumable,
    RadixConsumer,
    RadixECKeyPair,
    RadixParticle,
    RadixTransactionAtom,
    RadixTokenClass,
    RadixKeyPair,
} from '../RadixAtomModel'

export default class RadixTransactionBuilder {
    private type: string
    private payload: string
    private applicationId: string
    private particles: RadixParticle[] = []
    private action = 'STORE'
    private operation = 'TRANSFER'
    private recipients: RadixAccount[]
    private encrypted: boolean

    constructor() {}

    
    /**
     * Creates transfer atom
     * @param from Sender account, needs to have RadixAccountTransferSystem
     * @param to Receiver account
     * @param token The TokenClass or an ISO string name
     * @param decimalQuantity
     * @param [message] Optional reference message
     */
    public static createTransferAtom(
        from: RadixAccount,
        to: RadixAccount,
        token: RadixTokenClass | string,
        decimalQuantity: number,
        message?: string,
    ) {
        return new RadixTransactionBuilder().createTransferAtom(from, to, token, decimalQuantity, message)
    }


    /**
     * Creates transfer atom
     * @param from Sender account, needs to have RadixAccountTransferSystem
     * @param to Receiver account
     * @param token The TokenClass or an ISO string name
     * @param decimalQuantity
     * @param [message] Optional reference message
     */
    public createTransferAtom(
        from: RadixAccount,
        to: RadixAccount,
        token: RadixTokenClass | string,
        decimalQuantity: number,
        message?: string,
    ) {
        this.type = 'TRANSFER'

        if (isNaN(decimalQuantity)) {
            throw new Error('Amount is not a valid number')
        }

        let tokenClass
        if (typeof token === 'string') {
            tokenClass = radixTokenManager.getTokenByISO(token)
        } else if (token instanceof RadixTokenClass) {
            tokenClass = token
        } else {
            throw new Error('Invalid token supplied')
        }
        

        const quantity = tokenClass.toSubunits(decimalQuantity)

        if (quantity < 0) {
            throw new Error('Cannot send negative amount')
        } else if (quantity === 0 && decimalQuantity > 0) {
            const decimalPlaces = Math.log10(tokenClass.sub_units)
            throw new Error(`You can only specify up to ${decimalPlaces} decimal places`)
        } else if (quantity === 0 && decimalQuantity === 0) {
            throw new Error(`Cannot send 0`)
        }

        const transferSytem = from.getSystem(
            'TRANSFER'
        ) as RadixTransferAccountSystem

        if (quantity > transferSytem.balance[tokenClass.id.toString()]) {
            throw new Error('Insufficient funds')
        }

        const particles: RadixParticle[] = []
        const unspentConsumables = transferSytem.getUnspentConsumables()

        let consumerQuantity = 0
        for (const [, consumable] of unspentConsumables.entries()) {
            if ((consumable as RadixConsumable).asset_id.toString() !== tokenClass.id.toString()) {
                continue
            }

            const consumer = new RadixConsumer(consumable as object)
            particles.push(consumer)

            consumerQuantity += consumer.quantity
            if (consumerQuantity >= quantity) {
                break
            }
        }

        // Create consumables
        const recipientConsumable = new RadixConsumable()
        recipientConsumable.asset_id = tokenClass.id
        recipientConsumable.quantity = quantity
        // recipientConsumable.quantity = Long.fromNumber(quantity)
        recipientConsumable.destinations = [to.keyPair.getUID()]
        recipientConsumable.nonce = Date.now()
        recipientConsumable.owners = [
            RadixECKeyPair.fromRadixKeyPair(to.keyPair)
        ]

        particles.push(recipientConsumable)

        // Transfer reminder back to self
        if (consumerQuantity - quantity > 0) {
            const reminderConsumable = new RadixConsumable()
            reminderConsumable.asset_id = tokenClass.id
            reminderConsumable.quantity = consumerQuantity - quantity
            reminderConsumable.destinations = [from.keyPair.getUID()]
            reminderConsumable.nonce = Date.now()
            reminderConsumable.owners = [
                RadixECKeyPair.fromRadixKeyPair(from.keyPair)
            ]

            particles.push(reminderConsumable)
        }

        this.action = 'STORE'
        this.operation = 'TRANSFER'
        this.particles = particles
        this.recipients = [from, to]

        if (message) {
            this.payload = message
        }

        return this
    }

    /**
     * Creates payload atom
     * @param from
     * @param to
     * @param applicationId
     * @param payload
     * @param [encrypted] Sets if the message should be encrypted using ECIES
     */
    public static createPayloadAtom(
        readers: RadixAccount[],
        applicationId: string,
        payload: string,
        encrypted: boolean = true,
    ) {
        return new RadixTransactionBuilder().createPayloadAtom(readers, applicationId, payload, encrypted)
    }


    /**
     * Creates payload atom
     * @param from
     * @param to
     * @param applicationId
     * @param payload
     * @param [encrypted] Sets if the message should be encrypted using ECIES
     */
    public createPayloadAtom(
        readers: RadixAccount[],
        applicationId: string,
        payload: string,
        encrypted: boolean = true,
    ) {
        this.type = 'PAYLOAD'

        const recipients = []
        for (const account of readers) {
            recipients.push(account)
        }

        this.recipients = recipients
        this.applicationId = applicationId
        this.payload = payload
        this.encrypted = encrypted

        return this
    }

    /**
     * Creates radix messaging application payload atom
     * @param from
     * @param to
     * @param message
     */
    public static createRadixMessageAtom(
        from: RadixAccount,
        to: RadixAccount,
        message: string,
    ) { 
        return new RadixTransactionBuilder().createRadixMessageAtom(from, to, message)
    }

    /**
     * Creates radix messaging application payload atom
     * @param from
     * @param to
     * @param message
     */
    public createRadixMessageAtom(
        from: RadixAccount,
        to: RadixAccount,
        message: string,
    ) {
        this.type = 'PAYLOAD'

        const recipients = []
        recipients.push(from)
        recipients.push(to)

        const payload = JSON.stringify({
            to: to.getAddress(),
            from: from.getAddress(),
            content: message,
        })

        this.recipients = recipients
        this.applicationId = 'radix-messaging'
        this.payload = payload
        this.encrypted = true

        return this
    }

    /**
     * Builds the atom, finds a node to submit to, adds network fee, signs the atom and submits
     * @param signer
     * @returns a BehaviourSubject that streams the atom status updates
     */
    public signAndSubmit(signer: RadixSignatureProvider) {
        let atom = null

        if (this.type === 'TRANSFER') {
            atom = new RadixTransactionAtom()

            atom.action = this.action
            atom.operation = this.operation
            atom.particles = this.particles
            atom.destinations = this.recipients.map(account => account.keyPair.getUID())
            atom.timestamps = { default: Date.now() }

            if (this.payload) {
                atom.addEncryptedPayload(this.payload, this.recipients.map(account => account.keyPair))
            }
        } else if (this.type === 'PAYLOAD') {
            atom = RadixApplicationPayloadAtom.withEncryptedPayload(
                this.payload,
                this.recipients.map(account => account.keyPair),
                this.applicationId,
                this.encrypted,
            )

            atom.particles = this.particles
        } else {
            throw new Error('Atom details have not been specified, call one of the builder methods first')
        }

        // Find a shard, any of the participant shards is ok
        const shard = this.recipients[0].keyPair.getShard()

        // Get node from universe
        let nodeConnection: RadixNodeConnection = null

        const stateSubject = new BehaviorSubject<string>('FINDING_NODE')

        let signedAtom = null

        radixUniverse
            .getNodeConnection(shard)
            .then(connection => {
                nodeConnection = connection

                // Add POW fee
                stateSubject.next('GENERATING_POW')
                return RadixFeeProvider.generatePOWFee(
                    radixUniverse.universeConfig.getMagic(),
                    radixTokenManager.getTokenByISO('POW'),
                    atom,
                    nodeConnection,
                )
            })
            .then(powFeeConsumable => {
                atom.particles.push(powFeeConsumable)

                // Sign atom
                stateSubject.next('SIGNING')
                return signer.signAtom(atom)
            })
            .then(_signedAtom => {
                signedAtom = _signedAtom

                // Push atom into recipient accounts to minimize delay
                for (const recipient of this.recipients) {
                    recipient._onAtomReceived({
                        action: 'STORE',
                        atom: signedAtom,
                    })
                }

                const submissionSubject = nodeConnection.submitAtom(signedAtom)
                submissionSubject.subscribe(stateSubject)
                submissionSubject.subscribe({error: error => {
                    // Delete atom from recipient accounts
                    for (const recipient of this.recipients) {
                        recipient._onAtomReceived({
                            action: 'DELETE',
                            atom: signedAtom,
                        })
                    }
                }})
            })
            .catch(error => {
                stateSubject.error(error)
            })

        return stateSubject
    }
}
