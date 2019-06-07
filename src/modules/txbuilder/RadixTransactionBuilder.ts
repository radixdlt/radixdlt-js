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
    RadixAddress,
    RadixSpunParticle,
    RadixAtom,
    RadixMessageParticle,
    RadixFungibleType,
    RadixTokenDefinitionParticle,
    RadixTokenPermissions,
    RadixTokenPermissionsValues,
    RadixUnallocatedTokensParticle,
    RadixTransferrableTokensParticle,
    RadixUniqueParticle,
    RRI,
    RadixRRIParticle,
} from '../atommodel'

import { logger } from '../common/RadixLogger'
import { RadixTokenDefinition, RadixTokenSupplyType } from '../token/RadixTokenDefinition'

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

        const subunitsQuantity = RadixTokenDefinition.fromDecimalToSubunits(unitsQuantity)

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
        tokenReference: string | RRI,
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
        tokenReference: string | RRI,
        decimalQuantity: number | string | Decimal,
        message?: string,
    ) {
        tokenReference = (tokenReference instanceof RRI)
            ? tokenReference
            : RRI.fromString(tokenReference)

        const subunitsQuantity = this.getSubUnitsQuantity(decimalQuantity)

        const transferSytem = from.transferSystem

        if (subunitsQuantity.gt(transferSytem.balance[tokenReference.toString()])) {
            throw new Error('Insufficient funds')
        }

        const unspentConsumables = transferSytem.getUnspentConsumables()

        const createTransferAtomParticleGroup = new RadixParticleGroup()

        const consumerQuantity = new BN(0)
        let granularity = new BN(1)
        let tokenPermissions
        for (const consumable of unspentConsumables) {
            if (!consumable.getTokenDefinitionReference().equals(tokenReference)) {
                continue
            }

            // Assumes all consumables of a token have the same granularity and permissions(enforced by core)
            granularity = consumable.getGranularity()
            tokenPermissions = consumable.getTokenPermissions()

            createTransferAtomParticleGroup.particles.push(RadixSpunParticle.down(consumable))

            consumerQuantity.iadd(consumable.getAmount())
            if (consumerQuantity.gte(subunitsQuantity)) {
                break
            }
        }

        createTransferAtomParticleGroup.particles.push(RadixSpunParticle.up(
            new RadixTransferrableTokensParticle(
                subunitsQuantity,
                granularity,
                to.address,
                Date.now(),
                tokenReference,
                tokenPermissions,
            )))

        // Remainder to myself
        if (consumerQuantity.sub(subunitsQuantity).gtn(0)) {
            createTransferAtomParticleGroup.particles.push(RadixSpunParticle.up(
                new RadixTransferrableTokensParticle(
                    consumerQuantity.sub(subunitsQuantity),
                    granularity,
                    from.address,
                    Date.now(),
                    tokenReference,
                    tokenPermissions,
                )))
        }

        if (!subunitsQuantity.mod(granularity).eq(this.BNZERO)) {
            throw new Error(`This token requires that any tranferred amount is a multiple of it's granularity = 
                ${RadixTokenDefinition.fromSubunitsToDecimal(granularity)}`)
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
     * @param  {string|RRI} tokenReference
     * @param  {string|number|Decimal} decimalQuantity
     */
    public static createBurnAtom(
        ownerAccount: RadixAccount, 
        tokenReference: string | RRI, 
        decimalQuantity: string | number | Decimal) {
        return new this().burnTokens(ownerAccount, tokenReference, decimalQuantity)
    }

    /**
     * Create an atom to burn a specified amount of tokens
     * The token must be multi-issuance
     * 
     * @param  {RadixAccount} ownerAccount must be the owner and the holder of the tokens to be burned
     * @param  {string|RRI} tokenReference
     * @param  {string|number|Decimal} decimalQuantity
     */
    public burnTokens(
        ownerAccount: RadixAccount, 
        tokenReference: string | RRI, 
        decimalQuantity: string | number | Decimal) {

        tokenReference = (tokenReference instanceof RRI)
            ? tokenReference
            : RRI.fromString(tokenReference)
            
        const tokenClass = ownerAccount.tokenDefinitionSystem.getTokenDefinition(tokenReference.getName())
        const subunitsQuantity = this.getSubUnitsQuantity(decimalQuantity)

        const transferSytem = ownerAccount.transferSystem

        if (tokenClass.tokenSupplyType !== RadixTokenSupplyType.MUTABLE) {
            throw new Error('This token is fixed supply')
        }

        if (subunitsQuantity.gt(transferSytem.balance[tokenReference.toString()])) {
            throw new Error('Insufficient funds')
        }

        if (!subunitsQuantity.mod(tokenClass.getGranularity()).eq(this.BNZERO)) {
            throw new Error(`This token requires that any tranferred amount is a multiple of it's granularity = 
                ${RadixTokenDefinition.fromSubunitsToDecimal(tokenClass.getGranularity())}`)
        }

        const unspentConsumables = transferSytem.getUnspentConsumables()

        const burnParticleGroup = new RadixParticleGroup()

        const consumerQuantity = new BN(0)
        let tokenPermissions
        for (const consumable of unspentConsumables) {
            if (!consumable.getTokenDefinitionReference().equals(tokenReference)) {
                continue
            }

            burnParticleGroup.particles.push(RadixSpunParticle.down(consumable))

            tokenPermissions = consumable.getTokenPermissions()            

            consumerQuantity.iadd(consumable.getAmount())
            if (consumerQuantity.gte(subunitsQuantity)) {
                break
            }
        }

        burnParticleGroup.particles.push(RadixSpunParticle.up(
            new RadixUnallocatedTokensParticle(
                subunitsQuantity,
                tokenClass.getGranularity(),
                Date.now(),
                tokenReference,
                tokenPermissions,
            )))

        // Remainder to myself
        if (consumerQuantity.sub(subunitsQuantity).gtn(0)) {
            burnParticleGroup.particles.push(RadixSpunParticle.up(
                new RadixTransferrableTokensParticle(
                    consumerQuantity.sub(subunitsQuantity),
                    tokenClass.getGranularity(),
                    ownerAccount.address,
                    Date.now(),
                    tokenReference,
                    tokenPermissions,
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
     * @param  {string|RRI} tokenReference
     * @param  {string|number|Decimal} decimalQuantity
     */
    public static createMintAtom(
        ownerAccount: RadixAccount, 
        tokenReference: string | RRI, 
        decimalQuantity: string | number | Decimal) {
        return new this().mintTokens(ownerAccount, tokenReference, decimalQuantity)
    }
    

    /**
     * Create an atom to mint a specified amount of tokens
     * The token must be multi-issuance
     * 
     * @param  {RadixAccount} ownerAccount must be the owner of the token
     * @param  {string|RRI} tokenReference
     * @param  {string|number|Decimal} decimalQuantity
     */
    public mintTokens(
        ownerAccount: RadixAccount, 
        tokenReference: string | RRI, 
        decimalQuantity: string | number | Decimal) {
        
        tokenReference = (tokenReference instanceof RRI)
            ? tokenReference
            : RRI.fromString(tokenReference)

        const tokenClass = ownerAccount.tokenDefinitionSystem.getTokenDefinition(tokenReference.getName())
        const subunitsQuantity = this.getSubUnitsQuantity(decimalQuantity)

        if (tokenClass.tokenSupplyType !== RadixTokenSupplyType.MUTABLE) {
            throw new Error('This token is fixed supply')
        }

        if (subunitsQuantity.gte(tokenClass.getUnallocatedSupply())) {
            throw new Error('Total supply would exceed 2^256')
        }


        if (!subunitsQuantity.mod(tokenClass.getGranularity()).eq(this.BNZERO)) {
            throw new Error(`This token requires that any tranferred amount is a multiple of it's granularity = 
                ${RadixTokenDefinition.fromSubunitsToDecimal(tokenClass.getGranularity())}`)
        }

        this.participants.set(ownerAccount.getAddress(), ownerAccount)

        
        const unallocatedTokens = tokenClass.getUnallocatedTokens()
        const tokenPermissions = unallocatedTokens[0].getTokenPermissions()

        const particleGroup = new RadixParticleGroup()
        const consumerQuantity = new BN(0)
        for (const consumable of unallocatedTokens) {
            particleGroup.particles.push(RadixSpunParticle.down(consumable))

            consumerQuantity.iadd(consumable.getAmount())
            if (consumerQuantity.gte(subunitsQuantity)) {
                break
            }
        }

        // Remainder
        if (consumerQuantity.sub(subunitsQuantity).gtn(0)) {
            particleGroup.particles.push(RadixSpunParticle.up(
                new RadixUnallocatedTokensParticle(
                    consumerQuantity.sub(subunitsQuantity),
                    tokenClass.getGranularity(),
                    Date.now(),
                    tokenReference,
                    tokenPermissions,
                )))
        }

        const particle = new RadixTransferrableTokensParticle(
            subunitsQuantity,
            tokenClass.getGranularity(),
            ownerAccount.address,
            Date.now(),
            tokenReference,
            tokenPermissions,
        )
        particleGroup.particles.push(RadixSpunParticle.up(particle))

        this.particleGroups.push(particleGroup)


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

        const tokenClassParticle = new RadixTokenDefinitionParticle(
            owner.address,
            name,
            symbol,
            description,
            granularity,
            permissions)

        const rriParticle = new RadixRRIParticle(tokenClassParticle.getRRI())

        const initialSupplyParticle = new RadixUnallocatedTokensParticle(
            new BN(2).pow(new BN(256)).subn(1),
            granularity,
            Date.now(),
            tokenClassParticle.getTokenDefinitionReference(),
            permissions,
        )

        const createTokenParticleGroup = new RadixParticleGroup([
            RadixSpunParticle.down(rriParticle),
            RadixSpunParticle.up(tokenClassParticle),
            RadixSpunParticle.up(initialSupplyParticle),
        ])
        this.particleGroups.push(createTokenParticleGroup)

        if (tokenAmount.gten(0)) {
            const mintParticle = new RadixTransferrableTokensParticle(
                tokenAmount,
                granularity,
                owner.address,
                Date.now(),
                tokenClassParticle.getTokenDefinitionReference(),
                permissions,
            )

            const mintParticleGroup = new RadixParticleGroup([
                RadixSpunParticle.down(initialSupplyParticle),
                RadixSpunParticle.up(mintParticle),
            ])

            const remainder = initialSupplyParticle.getAmount().sub(mintParticle.getAmount())
            if (remainder.gten(0)) {
                // Remainder
                const remainingSupplyParticle = new RadixUnallocatedTokensParticle(
                    remainder,
                    granularity,
                    Date.now(),
                    tokenClassParticle.getTokenDefinitionReference(),
                    permissions,
                )
                mintParticleGroup.particles.push(RadixSpunParticle.up(remainingSupplyParticle))
            }

            this.particleGroups.push(mintParticleGroup)
        }

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
            mint: RadixTokenPermissionsValues.TOKEN_CREATION_ONLY,
            burn: RadixTokenPermissionsValues.TOKEN_CREATION_ONLY,
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
            return new RadixTransactionBuilder().addUnencryptedMessage(
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
        const recipientPubKeys = recipients.map(r => r.address.getPublic())

        const {protectors, ciphertext} = RadixECIES.encryptForMultiple(recipientPubKeys, Buffer.from(message))

        this.addMessageParticle(
            from,
            ciphertext,
            {
                application: applicationId,
            },
            recipients,
        )

        this.addMessageParticle(
            from,
            JSON.stringify(protectors.map(p => p.toString('base64'))),
            {
                application: 'encryptor',
                contentType: 'application/json',
            },
            recipients,
        )

        return this
    }


    public addUnencryptedMessage(
        from: RadixAccount,
        applicationId: string,
        message: string,
        recipients: RadixAccount[],
    ) {
        const recipientPubKeys = recipients.map(r => r.address.getPublic())
        
        this.addMessageParticle(
            from,
            message,
            {
                application: applicationId,
            },
            recipients,
        )

        return this
    }

    public addMessageParticle(from: RadixAccount, data: string | Buffer, metadata: {}, recipients: RadixAccount[]) {
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
     * Add a particle which enforces that only one such particle can exists per account,
     * enforced on the ledger level
     * 
     * @param  {RadixAccount} account Scope of the uniqueness constraint
     * @param  {string} unique The unique id
     */
    public addUniqueParticle(account: RadixAccount, unique: string) {
        const uniqueParticle = new RadixUniqueParticle(account.address, unique)
        const rriParticle = new RadixRRIParticle(uniqueParticle.getRRI())

        const uniqueParticleGroup = new RadixParticleGroup([
            RadixSpunParticle.down(rriParticle),
            RadixSpunParticle.up(uniqueParticle),
        ])

        this.particleGroups.push(uniqueParticleGroup)

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
        const shard = atom.getShards()[0]
        
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
        const stateSubject = new BehaviorSubject<string>('GENERATING_POW')
        
        atom.clearPowNonce()

        RadixFeeProvider.generatePOWFee(
            radixUniverse.universeConfig.getMagic(),
            atom,
        ).then(pow => {
            atom.setPowNonce(pow.nonce)

            // Sign atom
            stateSubject.next('SIGNING')
            return signer.signAtom(atom)
        }).then(_signedAtom => {
            signedAtom = _signedAtom

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
