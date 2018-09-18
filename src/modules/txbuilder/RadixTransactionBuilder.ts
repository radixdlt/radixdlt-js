import RadixSignatureProvider from '../identity/RadixSignatureProvider';
import RadixAccount from '../account/RadixAccount';
import { radixToken} from '../..';
import RadixTransferAccountSystem from '../account/RadixTransferAccountSystem';
import { radixUniverse } from '../universe/RadixUniverse';
import RadixFeeProvider from '../fees/RadixFeeProvider';
import { BehaviorSubject } from 'rxjs';
import { RadixNodeConnection } from '../universe/RadixNodeConnection';



import {RadixApplicationPayloadAtom,
    RadixAtom,
    RadixConsumable,
    RadixConsumer,
    RadixECKeyPair,
    RadixParticle,
    RadixTransactionAtom,
    RadixTokenClass,
    RadixKeyPair,
    } from '../atom_model'


export default class RadixTransactionBuilder {

    private type: string
    private payload: any
    private applicationId: string
    private particles: RadixParticle[] = []
    private action = 'STORE'
    private operation = 'TRANSFER'
    private recipients: RadixKeyPair[]
    private encrypted: boolean

    constructor() {
        //
    }

    
    /**
     * Creates transfer atom
     * @param from Sender account, needs to have RadixAccountTransferSystem
     * @param to Receiver account
     * @param token
     * @param decimalQuantity 
     * @param [message] Optional reference message
     */
    public createTransferAtom(from: RadixAccount, to: RadixAccount, token: RadixTokenClass, decimalQuantity: number) {
        this.type = 'TRANSFER'
        
        if (isNaN(decimalQuantity)) {
            throw new Error('Amount is not a valid number')
        }
    
        const quantity = token.toToken(decimalQuantity)
    
        if (quantity < 0) {
            throw new Error('Cannot send negative amount')
        } else if (quantity === 0 && decimalQuantity > 0) {
            const decimalPlaces = Math.log10(token.sub_units)
            throw new Error(`You can only specify up to ${decimalPlaces} decimal places`)
        } else if (quantity === 0 && decimalQuantity === 0) {
            throw new Error(`Cannot send 0`)
        }

       
        const transferSytem = from.getSystem('TRANSFER') as RadixTransferAccountSystem   
    
        if (quantity > transferSytem.balance[token.id.toString()]) {
            throw new Error('Insufficient funds')
        }
    
        const particles: RadixParticle[] = []
        const unspentConsumables = transferSytem.getUnspentConsumables()

        let consumerQuantity = 0
        for (const [, consumable] of unspentConsumables.entries()) {
            if ((consumable as RadixConsumable).asset_id.toString() !== token.id.toString()) {
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
        recipientConsumable.asset_id = token.id
        recipientConsumable.quantity = quantity
        recipientConsumable.destinations = [to.keyPair.getUID()]
        recipientConsumable.nonce = Date.now()
        recipientConsumable.owners = [RadixECKeyPair.fromRadixKeyPair(to.keyPair)]
    
        particles.push(recipientConsumable)
        
        // Transfer reminder back to self
        if (consumerQuantity - quantity > 0) {
            const reminderConsumable = new RadixConsumable()
            reminderConsumable.asset_id = token.id
            reminderConsumable.quantity = consumerQuantity - quantity
            reminderConsumable.destinations = [from.keyPair.getUID()]
            reminderConsumable.nonce = Date.now()
            reminderConsumable.owners = [RadixECKeyPair.fromRadixKeyPair(from.keyPair)]
        
            particles.push(reminderConsumable)
        }
        
    
        this.action = 'STORE'
        this.operation = 'TRANSFER'
        this.particles = particles
        this.recipients = [from.keyPair, to.keyPair]

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
    public createPayloadAtom(from: RadixAccount, to: RadixAccount[], applicationId: string, payload: any, encrypted: boolean = true) {
        this.type = 'PAYLOAD'
        
        const recipients = []
        recipients.push(from.keyPair)

        for (const account of to) {
            recipients.push(account.keyPair)
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
    public createRadixMessageAtom(from: RadixAccount, to: RadixAccount, message: string) {
        this.type = 'PAYLOAD'
        
        const recipients = []
        recipients.push(from.keyPair)
        recipients.push(to.keyPair)

        const payload = {
            to: to.getAddress(),
            from: from.getAddress(),
            content: message,
        }

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
            atom.destinations = this.recipients.map(keyPair => keyPair.getUID())
            atom.timestamps = { default: Date.now() }
            
            if (this.payload) {
                atom.addEncryptedPayload(this.payload, this.recipients)
            }
            
        } else if (this.type === 'PAYLOAD') {
            atom = RadixApplicationPayloadAtom.withEncryptedPayload(
                this.payload,
                this.recipients,
                this.applicationId,
                this.encrypted,
            )
        } else {
            throw new Error('Atom details have not been specified, call one of the builder methods first')
        }
        
        // Find a shard, any of the participant shards is ok
        const shard = this.recipients[0].getShard()
        
        // Get node from universe
        let nodeConnection: RadixNodeConnection = null
        const stateSubject = new BehaviorSubject<string>('FINDING_NODE')
        radixUniverse.getNodeConnection(shard).then(connection => {
            nodeConnection = connection

            // Add POW fee
            stateSubject.next('GENERATING_POW')
            return RadixFeeProvider.generatePOWFee(
                radixUniverse.universeConfig.getMagic(),
                radixToken.getTokenByISO('POW'),
                atom,
                nodeConnection,
            )
        }).then(powFeeConsumable => {            
            atom.particles.push(powFeeConsumable)

            // Sing atom
            stateSubject.next('SIGNING')
            return signer.signAtom(atom)
        }).then(signedAtom => {
            nodeConnection.submitAtom(signedAtom).subscribe(stateSubject)
        }).catch(error => {
            stateSubject.error(error)
        })

        return stateSubject
    }

}
