import { BehaviorSubject } from 'rxjs'


import { radixUniverse, 
    RadixSignatureProvider,
    RadixAccount,
    RadixTransferAccountSystem,
    RadixFeeProvider,
    radixTokenManager,
    RadixNodeConnection, 
    RadixECIES} from '../..'
import { RadixTokenClassReference, RadixAddress, RadixSpunParticle, RadixAtom, RadixMessageParticle, RadixSpin, RadixOwnedTokensParticle, RadixFungibleType } from '../atommodel';

import EC from 'elliptic'
import { TSMap } from 'typescript-map';
import Decimal from 'decimal.js';
import BN from 'bn.js'

        


export default class RadixTransactionBuilder {
    private particles: RadixSpunParticle[] = []
    private participants: TSMap<string, RadixAccount> =  new TSMap()

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
        token: RadixTokenClassReference,
        decimalQuantity: number,
        message?: string,
    ) {
        return new RadixTransactionBuilder().addTransfer(from, to, token, decimalQuantity, message)
    }


    /**
     * Creates transfer atom
     * @param from Sender account, needs to have RadixAccountTransferSystem
     * @param to Receiver account
     * @param token The TokenClassReference
     * @param decimalQuantity
     * @param [message] Optional reference message
     */
    public async addTransfer(
        from: RadixAccount,
        to: RadixAccount,
        tokenReference: RadixTokenClassReference,
        decimalQuantity: number | string | Decimal,
        message?: string,
    ) {
        if (typeof decimalQuantity !== 'number' 
            && typeof decimalQuantity !== 'string'
            && !Decimal.isDecimal(decimalQuantity)) 
        {
            throw new Error('Amount is not a valid number')
        }

        const unitsQuantity = new Decimal(decimalQuantity)

        const tokenClass = await radixTokenManager.getTokenClass(tokenReference.toString())

        const subunitsQuantity = tokenClass.fromDecimalToSubunits(unitsQuantity)

        const bnzero = new BN(0)
        const dczero = new Decimal(0)
        if (subunitsQuantity.lt(bnzero)) {
            throw new Error('Cannot send negative amount')
        } else if (subunitsQuantity.eq(bnzero) && unitsQuantity.greaterThan(dczero)) {
            const decimalPlaces = 18 // TODO: update to granularity
            throw new Error(`You can only specify up to ${decimalPlaces} decimal places`)
        } else if (subunitsQuantity.eq(bnzero) && unitsQuantity.eq(dczero)) {
            throw new Error(`Cannot send 0`)
        }

        const transferSytem = from.transferSystem

        if (subunitsQuantity.gt(transferSytem.balance[tokenReference.toString()])) {
            throw new Error('Insufficient funds')
        }

        const unspentConsumables = transferSytem.getUnspentConsumables()

        const consumerQuantity = new BN(0)
        for (const consumable of unspentConsumables) {
            if (!consumable.getTokenClassReference().equals(tokenReference)) {
                continue
            }

            this.particles.push(new RadixSpunParticle(consumable, RadixSpin.DOWN))

            consumerQuantity.iadd(consumable.getAmount())
            if (consumerQuantity.gte(subunitsQuantity)) {
                break
            }
        }

        this.particles.push(new RadixSpunParticle(
            new RadixOwnedTokensParticle(
                subunitsQuantity, 
                RadixFungibleType.TRANSFER,
                to.address,
                Date.now(),
                tokenReference,
                Date.now() / 60000 + 60000),
            RadixSpin.UP))


        // Remained to myself
        if (consumerQuantity.sub(subunitsQuantity) > bnzero) {
            this.particles.push(new RadixSpunParticle(
                new RadixOwnedTokensParticle(
                    consumerQuantity.sub(subunitsQuantity), 
                    RadixFungibleType.TRANSFER,
                    from.address,
                    Date.now(),
                    tokenReference,
                    Date.now() / 60000 + 60000),
                RadixSpin.UP))
        }

        

        
        this.participants.set(from.getAddress(), from)
        this.participants.set(to.getAddress(), to)

        if (message) {
            this.addEncryptedMessage(from,
                'transfer',
                message,
                [to, from])
        }

        return this
    }

    /**
     * Creates payload atom
     * @param from
     * @param applicationId
     * @param payload
     * @param recipients Everyone who will receive and be able to decrypt the message
     * @param [encrypted] Sets if the message should be encrypted using ECIES
     */
    public static createPayloadAtom(
        from: RadixAccount,
        applicationId: string,
        payload: string,
        recipients: RadixAccount[],
        encrypted: boolean = true,
    ) {
        if (encrypted) {
            return new RadixTransactionBuilder().addEncryptedMessage(
                from, 
                applicationId,
                payload,
                recipients,
            )
        } else {
            return new RadixTransactionBuilder().addMessageParticle(
                from, 
                applicationId,
                payload,
                recipients,
            )
        }
       
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
        return new RadixTransactionBuilder().addEncryptedMessage(
            from, 
            'messaging', 
            message,
            [from, to])
    }

    public addEncryptedMessage(
        from: RadixAccount, 
        applicationId: string, 
        message: string, 
        recipients: RadixAccount[],
    ) {
        const ec = new EC.ec('secp256k1')
        // Generate key pair
        const ephemeral = ec.genKeyPair()

        // Encrypt key with receivers
        const protectors = []

        for (const recipient of recipients) {
            protectors.push(
                RadixECIES.encrypt(
                    recipient.address.getPublic(),
                    Buffer.from(ephemeral.getPrivate('hex'), 'hex'),
                ).toString('base64'),
            )
        }

        // Encrypt message
        const data =  RadixECIES.encrypt(
            ephemeral.getPublic(),
            Buffer.from(message),
        ) 
        


        this.addMessageParticle(
            from, 
            data, 
            {
                application: applicationId,
            }, 
            recipients,
        )

        this.addMessageParticle(
            from, 
            JSON.stringify(protectors),
            {
                application: 'encryptor',
            },
            recipients,
        )

        return this
    }

    public addMessageParticle(from: RadixAccount, data: string | Buffer, metadata: any, recipients: RadixAccount[]) {
        for (const recipient of recipients) {
            this.participants.set(recipient.getAddress(), recipient)
        }
        
        const particle = new RadixMessageParticle(
            from.address, 
            data,
            metadata,
            recipients.map(account => account.address),
        )

        this.particles.push(new RadixSpunParticle(particle, RadixSpin.UP))

        return this
    }

    /**
     * Builds the atom, finds a node to submit to, adds network fee, signs the atom and submits
     * @param signer
     * @returns a BehaviourSubject that streams the atom status updates
     */
    public signAndSubmit(signer: RadixSignatureProvider) {
        if (this.particles.length === 0) {
            throw new Error('No particles specified')
        }
        
        const atom = new RadixAtom()

        atom.particles = this.particles

        

        // Find a shard, any of the participant shards is ok
        const shard = atom.getAddresses()[0].getShard()

        // Get node from universe
        let nodeConnection: RadixNodeConnection = null

        const stateSubject = new BehaviorSubject<string>('FINDING_NODE')

        let signedAtom = null

        radixUniverse
            .getNodeConnection(shard)
            .then(connection => {
                nodeConnection = connection

                const endorsee = RadixAddress.fromPublic(nodeConnection.node.system.key.bytes)

                // Add POW fee
                stateSubject.next('GENERATING_POW')
                return RadixFeeProvider.generatePOWFee(
                    radixUniverse.universeConfig.getMagic(),
                    radixUniverse.powToken,
                    atom,
                    endorsee,
                )
            })
            .then(powFeeParticle => {
                atom.particles.push(new RadixSpunParticle(powFeeParticle, RadixSpin.UP))

                // Sign atom
                stateSubject.next('SIGNING')
                return signer.signAtom(atom)
            })
            .then(_signedAtom => {
                signedAtom = _signedAtom

                // Push atom into participant accounts to minimize delay
                for (const participant of this.participants.values()) {
                    participant._onAtomReceived({
                        action: 'STORE',
                        atom: signedAtom,
                        processedData: {},
                    })
                }

                const submissionSubject = nodeConnection.submitAtom(signedAtom)
                submissionSubject.subscribe(stateSubject)
                submissionSubject.subscribe({error: error => {
                    // Delete atom from participant accounts
                    for (const participant of this.participants.values()) {
                        participant._onAtomReceived({
                            action: 'DELETE',
                            atom: signedAtom,
                            processedData: {},
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
