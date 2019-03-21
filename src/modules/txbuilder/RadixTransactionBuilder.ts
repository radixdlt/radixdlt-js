import { BehaviorSubject } from 'rxjs'
import { TSMap } from 'typescript-map'

import EC from 'elliptic'
import Decimal from 'decimal.js'
import BN from 'bn.js'

import {
    radixUniverse,
    RadixSignatureProvider,
    RadixAccount,
    RadixTransferAccountSystem,
    RadixFeeProvider,
    radixTokenManager,
    RadixNodeConnection,
    RadixECIES,
    RadixParticleGroup,
} from '../..'

import {
    RadixTokenClassReference,
    RadixAddress,
    RadixSpunParticle,
    RadixAtom,
    RadixMessageParticle,
    RadixFungibleType,
    RadixTokenClassParticle,
    RadixTokenPermissions,
    RadixTokenPermissionsValues,
    RadixTransferredTokensParticle,
    RadixBurnedTokensParticle,
    RadixMintedTokensParticle,
} from '../atommodel'

import { logger } from '../common/RadixLogger'
import { RadixTokenClass } from '../token/RadixTokenClass'
import { RadixResourceIdentifier } from '../atommodel/primitives/RadixResourceIdentifier';

export default class RadixTransactionBuilder {
    private BNZERO: BN = new BN(0)
    private DCZERO: Decimal = new Decimal(0)

    private participants: TSMap<string, RadixAccount> = new TSMap()

    private particleGroups: RadixParticleGroup[] = []

    private getSubUnitsQuantity(decimalQuantity: Decimal.Value): BN {
        if (typeof decimalQuantity !== 'number' && typeof decimalQuantity !== 'string' && !Decimal.isDecimal(decimalQuantity)) {
            throw new Error('quantity is not a valid number')
        }

        const unitsQuantity = new Decimal(decimalQuantity)

        const subunitsQuantity = RadixTokenClass.fromDecimalToSubunits(unitsQuantity)

        if (subunitsQuantity.lt(this.BNZERO)) {
            throw new Error('Negative quantity is not allowed')
        } else if (subunitsQuantity.eq(this.BNZERO) && unitsQuantity.eq(this.DCZERO)) {
            throw new Error(`Quantity 0 is not valid`)
        }

        return subunitsQuantity
    }

    /**
     * Creates transfer atom
     * @param from Sender account, needs to have RadixAccountTransferSystem
     * @param to Receiver account
     * @param tokenReference TokenClassReference string
     * @param decimalQuantity
     * @param [message] Optional reference message
     */
    public static createTransferAtom(
        from: RadixAccount,
        to: RadixAccount,
        tokenReference: string | RadixTokenClassReference,
        decimalQuantity: number | string | Decimal,
        message?: string,
    ) {
        return new RadixTransactionBuilder().addTransfer(from, to, tokenReference, decimalQuantity, message)
    }

    /**
     * Creates transfer atom
     * @param from Sender account, needs to have RadixAccountTransferSystem
     * @param to Receiver account
     * @param tokenReferenceURI TokenClassReference string
     * @param decimalQuantity
     * @param [message] Optional reference message
     */
    public addTransfer(
        from: RadixAccount,
        to: RadixAccount,
        tokenReference: string | RadixTokenClassReference,
        decimalQuantity: number | string | Decimal,
        message?: string,
    ) {
        tokenReference = (tokenReference instanceof RadixTokenClassReference)
            ? tokenReference
            : RadixTokenClassReference.fromString(tokenReference)

        const subunitsQuantity = this.getSubUnitsQuantity(decimalQuantity)

        const transferSytem = from.transferSystem

        if (subunitsQuantity.gt(transferSytem.balance[tokenReference.toString()])) {
            throw new Error('Insufficient funds')
        }

        const unspentConsumables = transferSytem.getUnspentConsumables()

        const createTransferAtomParticleGroup = new RadixParticleGroup()

        const consumerQuantity = new BN(0)
        let granularity = new BN(1)
        for (const consumable of unspentConsumables) {
            const rri: RadixResourceIdentifier = consumable.getTokenTypeReference()
            if (!RadixTokenClassReference.fromString(rri.toString()).equals(tokenReference)) {
                continue
            }

            // Assumes all consumables of a token have the same granularity(enforced by core)
            granularity = consumable.getGranularity()

            createTransferAtomParticleGroup.particles.push(RadixSpunParticle.down(consumable))

            consumerQuantity.iadd(consumable.getAmount())
            if (consumerQuantity.gte(subunitsQuantity)) {
                break
            }
        }

        createTransferAtomParticleGroup.particles.push(RadixSpunParticle.up(
            new RadixTransferredTokensParticle(
                subunitsQuantity,
                granularity,
                to.address,
                Date.now(),
                tokenReference,
            )))

        // Remainder to myself
        if (consumerQuantity.sub(subunitsQuantity).gtn(0)) {
            createTransferAtomParticleGroup.particles.push(RadixSpunParticle.up(
                new RadixTransferredTokensParticle(
                    consumerQuantity.sub(subunitsQuantity),
                    granularity,
                    from.address,
                    Date.now(),
                    tokenReference,
                )))
        }

        if (!subunitsQuantity.mod(granularity).eq(this.BNZERO)) {
            throw new Error(`This token requires that any tranferred amount is a multiple of it's granularity = 
                ${RadixTokenClass.fromSubunitsToDecimal(granularity)}`)
        }

        this.participants.set(from.getAddress(), from)
        this.participants.set(to.getAddress(), to)

        if (message) {
            this.addEncryptedMessage(from,
                'transfer',
                message,
                [to, from])
        }

        this.particleGroups.push(createTransferAtomParticleGroup)

        return this
    }
    /**
     * Create an atom to burn a specified amount of tokens
     * ownerAccount must be the owner and the holder of the tokens to be burned
     * 
     * @param  {RadixAccount} ownerAccount
     * @param  {string|RadixTokenClassReference} tokenReference
     * @param  {string|number|Decimal} decimalQuantity
     */
    public static createBurnAtom(
        ownerAccount: RadixAccount, 
        tokenReference: string | RadixTokenClassReference, 
        decimalQuantity: string | number | Decimal) {
        return new this().burnTokens(ownerAccount, tokenReference, decimalQuantity)
    }

    /**
     * Create an atom to burn a specified amount of tokens
     * The token must be multi-issuance
     * 
     * @param  {RadixAccount} ownerAccount must be the owner and the holder of the tokens to be burned
     * @param  {string|RadixTokenClassReference} tokenReference
     * @param  {string|number|Decimal} decimalQuantity
     */
    public burnTokens(ownerAccount: RadixAccount, tokenReference: string | RadixTokenClassReference, decimalQuantity: string | number | Decimal) {
        tokenReference = (tokenReference instanceof RadixTokenClassReference)
            ? tokenReference
            : RadixTokenClassReference.fromString(tokenReference)
            
        const tokenClass = ownerAccount.tokenClassSystem.getTokenClass(tokenReference.symbol)
        const subunitsQuantity = this.getSubUnitsQuantity(decimalQuantity)

        const transferSytem = ownerAccount.transferSystem

        if (subunitsQuantity.gt(transferSytem.balance[tokenReference.toString()])) {
            throw new Error('Insufficient funds')
        }


        if (!subunitsQuantity.mod(tokenClass.getGranularity()).eq(this.BNZERO)) {
            throw new Error(`This token requires that any tranferred amount is a multiple of it's granularity = 
                ${RadixTokenClass.fromSubunitsToDecimal(tokenClass.getGranularity())}`)
        }

        const unspentConsumables = transferSytem.getUnspentConsumables()

        const burnParticleGroup = new RadixParticleGroup()

        const consumerQuantity = new BN(0)
        for (const consumable of unspentConsumables) {
            const rri: RadixResourceIdentifier = consumable.getTokenTypeReference()
            if (!RadixTokenClassReference.fromString(rri.toString()).equals(tokenReference)) {
                continue
            }

            burnParticleGroup.particles.push(RadixSpunParticle.down(consumable))
            

            consumerQuantity.iadd(consumable.getAmount())
            if (consumerQuantity.gte(subunitsQuantity)) {
                break
            }
        }

        burnParticleGroup.particles.push(RadixSpunParticle.up(
            new RadixBurnedTokensParticle(
                subunitsQuantity,
                tokenClass.getGranularity(),
                ownerAccount.address,
                Date.now(),
                tokenReference,
            )))

        // Remainder to myself
        if (consumerQuantity.sub(subunitsQuantity).gtn(0)) {
            burnParticleGroup.particles.push(RadixSpunParticle.up(
                new RadixTransferredTokensParticle(
                    consumerQuantity.sub(subunitsQuantity),
                    tokenClass.getGranularity(),
                    ownerAccount.address,
                    Date.now(),
                    tokenReference,
                )))
        }
        this.particleGroups.push(burnParticleGroup)

        this.participants.set(ownerAccount.getAddress(), ownerAccount)

        return this
    }

    /**
     * Create an atom to mint a specified amount of tokens
     * The token must be multi-issuance
     * 
     * @param  {RadixAccount} ownerAccount must be the owner of the token
     * @param  {string|RadixTokenClassReference} tokenReference
     * @param  {string|number|Decimal} decimalQuantity
     */
    public static createMintAtom(
        ownerAccount: RadixAccount, 
        tokenReference: string | RadixTokenClassReference, 
        decimalQuantity: string | number | Decimal) {
        return new this().mintTokens(ownerAccount, tokenReference, decimalQuantity)
    }
    

    /**
     * Create an atom to mint a specified amount of tokens
     * The token must be multi-issuance
     * 
     * @param  {RadixAccount} ownerAccount must be the owner of the token
     * @param  {string|RadixTokenClassReference} tokenReference
     * @param  {string|number|Decimal} decimalQuantity
     */
    public mintTokens(ownerAccount: RadixAccount, tokenReference: string | RadixTokenClassReference, decimalQuantity: string | number | Decimal) {
        tokenReference = (tokenReference instanceof RadixTokenClassReference)
            ? tokenReference
            : RadixTokenClassReference.fromString(tokenReference)

        const tokenClass = ownerAccount.tokenClassSystem.getTokenClass(tokenReference.symbol)
        const subunitsQuantity = this.getSubUnitsQuantity(decimalQuantity)


        if (tokenClass.totalSupply.add(subunitsQuantity).gte(new BN(2).pow(new BN(256)))) {
            throw new Error('Total supply would exceed 2^256')
        }


        if (!subunitsQuantity.mod(tokenClass.getGranularity()).eq(this.BNZERO)) {
            throw new Error(`This token requires that any tranferred amount is a multiple of it's granularity = 
                ${RadixTokenClass.fromSubunitsToDecimal(tokenClass.getGranularity())}`)
        }

        this.participants.set(ownerAccount.getAddress(), ownerAccount)

        const particle = new RadixMintedTokensParticle(
            subunitsQuantity,
            tokenClass.getGranularity(),
            ownerAccount.address,
            Date.now(),
            tokenReference,
        )

        const particleParticleGroup = new RadixParticleGroup([RadixSpunParticle.up(particle)])
        this.particleGroups.push(particleParticleGroup)


        return this
    }

    public createToken(
        owner: RadixAccount,
        name: string,
        symbol: string,
        description: string,
        granularity: BN,
        decimalQuantity: number | string | Decimal,
        permissions: RadixTokenPermissions,
    ) {
        const tokenAmount = this.getSubUnitsQuantity(decimalQuantity)

        this.participants.set(owner.getAddress(), owner)

        const tokenClassParticle = new RadixTokenClassParticle(
            owner.address,
            name,
            symbol,
            description,
            granularity,
            permissions)

        const createTokenParticleGroup = new RadixParticleGroup([RadixSpunParticle.up(tokenClassParticle)])

        if (tokenAmount.gten(0)) {
            const mintParticle = new RadixMintedTokensParticle(
                tokenAmount,
                granularity,
                owner.address,
                Date.now(),
                tokenClassParticle.getTokenClassReference(),
            )

            createTokenParticleGroup.particles.push(RadixSpunParticle.up(mintParticle))
        }

        this.particleGroups.push(createTokenParticleGroup)

        return this
    }

    public createTokenSingleIssuance(
        owner: RadixAccount,
        name: string,
        symbol: string,
        description: string,
        granularity = new BN(1),
        amount: string | number | Decimal,
    ) {
        const permissions = {
            mint: RadixTokenPermissionsValues.TOKEN_OWNER_ONLY,
            burn: RadixTokenPermissionsValues.TOKEN_OWNER_ONLY,
            transfer: RadixTokenPermissionsValues.ALL,
        }

        return this.createToken(owner, name, symbol, description, granularity, amount, permissions)
    }

    public createTokenMultiIssuance(
        owner: RadixAccount,
        name: string,
        symbol: string,
        description: string,
        granularity = new BN(1),
        amount: string | number | Decimal,
    ) {
        const permissions = {
            mint: RadixTokenPermissionsValues.TOKEN_OWNER_ONLY,
            transfer: RadixTokenPermissionsValues.ALL,
            burn: RadixTokenPermissionsValues.TOKEN_OWNER_ONLY,
        }

        return this.createToken(owner, name, symbol, description, granularity, amount, permissions)
    }

    /**
     * Creates payload atom
     * @param from
     * @param recipients Everyone who will receive and be able to decrypt the message
     * @param applicationId
     * @param payload
     * @param [encrypted] Sets if the message should be encrypted using ECIES
     */
    public static createPayloadAtom(
        from: RadixAccount,
        recipients: RadixAccount[],
        applicationId: string,
        payload: string,
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
            'message',
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
        const data = RadixECIES.encrypt(
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
                contentType: 'application/json',
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
            (recipients.length === 1) ? recipients[0].address : recipients[1].address,
            data,
            metadata,
        )

        const particleParticleGroup = new RadixParticleGroup([RadixSpunParticle.up(particle)])
        this.particleGroups.push(particleParticleGroup)

        return this
    }


    /**
     * Builds the atom, finds a node to submit to, adds network fee, signs the atom and submits
     * @param signer
     * @returns a BehaviourSubject that streams the atom status updates
     */
    public signAndSubmit(signer: RadixSignatureProvider) {
        const atom = this.buildAtom()
        
        const stateSubject = new BehaviorSubject<string>('FINDING_NODE')

        // Find a shard, any of the participant shards is ok
        const shard = atom.getAddresses()[0].getShard()
        
        // Get node from universe
        radixUniverse.getNodeConnection(shard)
            .then(connection => {
                RadixTransactionBuilder.signAndSubmitAtom(atom, connection, signer, this.participants.values())
                    .subscribe(stateSubject)
            })

        return stateSubject
    }

    public buildAtom() {
        if (this.particleGroups.length === 0) {
            throw new Error('No particle groups specified')
        }

        const atom = new RadixAtom()
        atom.particleGroups = this.particleGroups

        // Add timestamp
        atom.setTimestamp(Date.now())
        return atom
    }

    public static signAndSubmitAtom(atom: RadixAtom, connection: RadixNodeConnection, signer: RadixSignatureProvider, participants: RadixAccount[]) {
        let signedAtom = null
        
        // Add POW fee
        const endorsee = RadixAddress.fromPublic(connection.node.nodeInfo.system.key.bytes)

        const stateSubject = new BehaviorSubject<string>('GENERATING_POW')
        
        RadixFeeProvider.generatePOWFee(
            radixUniverse.universeConfig.getMagic(),
            radixUniverse.powToken,
            atom,
            endorsee,
        ).then(powFeeParticle => {
            const powFeeParticleGroup = new RadixParticleGroup([RadixSpunParticle.up(powFeeParticle)])
            atom.particleGroups.push(powFeeParticleGroup)

            // Sign atom
            stateSubject.next('SIGNING')
            return signer.signAtom(atom)
        }).then(_signedAtom => {
            signedAtom = _signedAtom

            logger.debug(signedAtom.hid.toString())

            // Push atom into participant accounts to minimize delay
            for (const participant of participants) {
                participant._onAtomReceived({
                    action: 'STORE',
                    atom: signedAtom,
                    processedData: {},
                    isHead: true,
                })
            }

            const submissionSubject = connection.submitAtom(signedAtom)
            submissionSubject.subscribe(stateSubject)
            submissionSubject.subscribe({
                error: error => {
                    logger.info('Problem submitting atom, deleting', error)
                    // Delete atom from participant accounts
                    for (const participant of participants) {
                        participant._onAtomReceived({
                            action: 'DELETE',
                            atom: signedAtom,
                            processedData: {},
                            isHead: true,
                        })
                    }
                }
            })
        }).catch(error => {
            stateSubject.error(error)
        })

        return stateSubject
    }
}
