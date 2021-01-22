/*
 * (C) Copyright 2020 Radix DLT Ltd
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the “Software”),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

import { BehaviorSubject, Observable, Subscription } from 'rxjs'
import Decimal from 'decimal.js'
import BN from 'bn.js'

import {
    RadixAccount,
    RadixAtomNodeStatus,
    RadixAtomNodeStatusUpdate,
    RadixECIES,
    RadixNodeConnection,
    RadixParticleGroup,
    radixUniverse,
} from '../..'

import {
    RadixAtom,
    RadixConsumable,
    RadixFixedSupplyTokenDefinitionParticle,
    RadixMessageParticle,
    RadixMutableSupplyTokenDefinitionParticle,
    RadixRRIParticle,
    RadixSpunParticle,
    RadixTokenPermissions,
    RadixTokenPermissionsValues,
    RadixTransferrableTokensParticle,
    RadixUnallocatedTokensParticle,
    RadixUniqueParticle,
    RRI,
} from '../atommodel'

import { logger } from '../common/RadixLogger'
import { RadixTokenDefinition, RadixTokenSupplyType } from '../token/RadixTokenDefinition'
import { calculateFeeForAtom } from '../fees/RadixTokenFeeCalculator'
import RadixIdentity from '../identity/RadixIdentity'
import { first } from 'rxjs-compat/operator/first'
import { share } from 'rxjs/operators'

export default class RadixTransactionBuilder {
    private BNZERO: BN = new BN(0)
    private DCZERO: Decimal = new Decimal(0)

    private particleGroups: RadixParticleGroup[] = []

    private subs = new Subscription()

    private spentConsumables: number[] = []
    private unspentConsumables: RadixConsumable[] = []

    private static getSubUnitsQuantity(decimalQuantity: Decimal.Value): BN {
        if (typeof decimalQuantity !== 'number' && typeof decimalQuantity !== 'string' && !Decimal.isDecimal(decimalQuantity)) {
            throw new Error('quantity is not a valid number')
        }

        const unitsQuantity = new Decimal(decimalQuantity)

        return RadixTokenDefinition.fromDecimalToSubunits(unitsQuantity)
    }

    /**
     * Creates an atom that sends a token from one account to another
     * 
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
     * Creates an atom that sends a token from one account to another
     * 
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
        if (from.address.equals(to.address)) {
            throw new Error(`Cannot send money to the same account`)
        }

        tokenReference = (tokenReference instanceof RRI)
            ? tokenReference
            : RRI.fromString(tokenReference)

        const subunitsQuantity = RadixTransactionBuilder.getSubUnitsQuantity(decimalQuantity)

        if (subunitsQuantity.lt(this.BNZERO)) {
            throw new Error('Negative quantity is not allowed')
        } else if (subunitsQuantity.eq(this.BNZERO)) {
            throw new Error(`Quantity 0 is not valid`)
        }

        const transferSystem = from.transferSystem

        const balanceOfToken = transferSystem.balance[tokenReference.toString()]
        if (balanceOfToken === undefined) {
            const errorMsg = `Balance undefined, token ${tokenReference.toString()}, balances:\n${JSON.stringify(transferSystem.balance, null, 4)}\n\n`
            // logger.error(errorMsg)
            throw new Error(errorMsg)
        }

        if (subunitsQuantity.gt(balanceOfToken)) {
            throw new Error('Insufficient funds')
        }

        const unspentConsumables = transferSystem.getUnspentConsumables()
        for (let consumable of this.unspentConsumables) {
            unspentConsumables.push(consumable)
        }

        const createTransferAtomParticleGroup = new RadixParticleGroup()

        const consumerQuantity = new BN(0)
        let granularity = unspentConsumables[0].getGranularity()
        let tokenPermissions = unspentConsumables[0].getTokenPermissions()

        createTransferAtomParticleGroup.particles.push(RadixSpunParticle.up(
            new RadixTransferrableTokensParticle(
                subunitsQuantity,
                granularity,
                to.address,
                tokenReference,
                tokenPermissions,
        )))

        for (const consumable of unspentConsumables.sort((a, b) => {
            return a.getAmount().sub(b.getAmount()).gt(new BN(0)) ? 1 : -1
        })) {
            if (!consumable.getTokenDefinitionReference().equals(tokenReference)) {
                continue
            }

            if (this.spentConsumables.includes(consumable.nonce)) {
                continue
            }

            tokenPermissions = consumable.getTokenPermissions()

            createTransferAtomParticleGroup.particles.push(RadixSpunParticle.down(consumable))

            consumerQuantity.iadd(consumable.getAmount())

            this.spentConsumables.push(consumable.nonce)

            if (consumerQuantity.gte(subunitsQuantity)) {
                break
            }
        }


        // Remainder to myself
        if (consumerQuantity.sub(subunitsQuantity).gtn(0)) {
            const TTP =
                new RadixTransferrableTokensParticle(
                    consumerQuantity.sub(subunitsQuantity),
                    granularity,
                    from.address,
                    tokenReference,
                    tokenPermissions,
                )
            const remainderParticle = RadixSpunParticle.up(TTP)
            createTransferAtomParticleGroup.particles.push(remainderParticle)
            this.unspentConsumables.push(TTP)
        }

        if (!subunitsQuantity.mod(granularity).eq(this.BNZERO)) {
            throw new Error(`This token requires that any tranferred amount is a multiple of it's granularity = 
                ${RadixTokenDefinition.fromSubunitsToDecimal(granularity)}`)
        }

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
     * 
     * @param  {RadixAccount} ownerAccount owner and the holder of the tokens to be burned
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
        const subunitsQuantity = RadixTransactionBuilder.getSubUnitsQuantity(decimalQuantity)

        if (subunitsQuantity.lt(this.BNZERO)) {
            throw new Error('Negative quantity is not allowed')
        } else if (subunitsQuantity.eq(this.BNZERO)) {
            throw new Error(`Quantity 0 is not valid`)
        }

        const transferSytem = ownerAccount.transferSystem

        if (!tokenReference.equals(radixUniverse.nativeToken) && tokenClass.tokenSupplyType !== RadixTokenSupplyType.MUTABLE) {
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
        for (let consumable of this.unspentConsumables) {
            unspentConsumables.push(consumable)
        }

        const burnParticleGroup = new RadixParticleGroup()

        const consumerQuantity = new BN(0)
        let tokenPermissions

        for (const consumable of unspentConsumables) {
            if (!consumable.getTokenDefinitionReference().equals(tokenReference)) {
                continue
            }

            if (this.spentConsumables.includes(consumable.nonce)) {
                continue
            }

            burnParticleGroup.particles.push(RadixSpunParticle.down(consumable))

            tokenPermissions = consumable.getTokenPermissions()

            consumerQuantity.iadd(consumable.getAmount())

            this.spentConsumables.push(consumable.nonce)

            if (consumerQuantity.gte(subunitsQuantity)) {
                break
            }
        }

        burnParticleGroup.particles.push(RadixSpunParticle.up(
            new RadixUnallocatedTokensParticle(
                subunitsQuantity,
                tokenClass.getGranularity(),
                tokenReference,
                tokenPermissions,
            )))

        // Remainder to myself
        if (consumerQuantity.sub(subunitsQuantity).gtn(0)) {
            const TTP = new RadixTransferrableTokensParticle(
                consumerQuantity.sub(subunitsQuantity),
                tokenClass.getGranularity(),
                ownerAccount.address,
                tokenReference,
                tokenPermissions,
            )
            const remainderParticle = RadixSpunParticle.up(TTP)
            burnParticleGroup.particles.push(remainderParticle)
            this.unspentConsumables.push(TTP)
        }
        this.particleGroups.push(burnParticleGroup)

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
     * @param  {RadixAccount} to optional param, will mint and transfer to this address if set.
     * @param  {string} message optional message to the receiver (only applicable if 'to' param is set).
     */
    public mintTokens(
        ownerAccount: RadixAccount,
        tokenReference: string | RRI,
        decimalQuantity: string | number | Decimal,
        to?: RadixAccount,
        message?: string) {

        tokenReference = (tokenReference instanceof RRI)
            ? tokenReference
            : RRI.fromString(tokenReference)

        const tokenClass = ownerAccount.tokenDefinitionSystem.getTokenDefinition(tokenReference.getName())

        if (!tokenClass) {
            throw new Error(`ERROR: Token definition ${tokenReference.getName()} not found in owner account.`)
        }

        const subunitsQuantity = RadixTransactionBuilder.getSubUnitsQuantity(decimalQuantity)

        if (subunitsQuantity.lt(this.BNZERO)) {
            throw new Error('Negative quantity is not allowed')
        } else if (subunitsQuantity.eq(this.BNZERO)) {
            throw new Error(`Quantity 0 is not valid`)
        }

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
                    tokenReference,
                    tokenPermissions,
                )))
        }

        const receiverAccount = to || ownerAccount

        const particle = new RadixTransferrableTokensParticle(
            subunitsQuantity,
            tokenClass.getGranularity(),
            receiverAccount.address,
            tokenReference,
            tokenPermissions,
        )

        if (to && message) {
            this.addEncryptedMessage(ownerAccount,
                'transfer',
                message,
                [to, ownerAccount])

        }

        particleGroup.particles.push(RadixSpunParticle.up(particle))

        this.particleGroups.push(particleGroup)


        return this
    }

    /**
     * Add a particle group to the atom which will create a new token with a fixed supply
     * 
     * @param owner This will be the owner of the new token definition
     * @param name The name of the token
     * @param symbol The abbreviated symbol of the token, up to 14 alphanumeric characters long
     * @param description An extended description of the token
     * @param granularity Minimal indivisible amount of token that can be transacted. Every transaction must be a multiple of it
     * @param decimalQuantity The total supply of the token
     * @param iconUrl A valid url cointaining the icon of the token
     */
    public createTokenSingleIssuance(
        owner: RadixAccount,
        name: string,
        symbol: string,
        description: string,
        granularity: string | number | Decimal = new Decimal('1e-18'),
        decimalQuantity: string | number | Decimal,
        url: string,
        iconUrl: string,
    ) {
        const subunitsQuantity = RadixTransactionBuilder.getSubUnitsQuantity(decimalQuantity)
        const subunitsGranularity = RadixTransactionBuilder.getSubUnitsQuantity(granularity)

        if (subunitsQuantity.lte(this.BNZERO)) {
            throw new Error('Single-issuance tokens must be created with some supply')
        }

        if (subunitsGranularity.ltn(1)) {
            throw new Error('Granuarity has to be larger than or equal to 1e-18')
        }

        if (!subunitsQuantity.mod(subunitsGranularity).eq(this.BNZERO)) {
            throw new Error(`The supply should be a multiple of the token granularity = 
                ${RadixTokenDefinition.fromSubunitsToDecimal(subunitsGranularity)}`)
        }

        const tokenClassParticle = new RadixFixedSupplyTokenDefinitionParticle(
            owner.address,
            name,
            symbol,
            description,
            subunitsQuantity,
            subunitsGranularity,
            url,
            iconUrl,
        )

        const rriParticle = new RadixRRIParticle(tokenClassParticle.getRRI())

        const initialSupplyParticle = new RadixTransferrableTokensParticle(
            subunitsQuantity,
            subunitsGranularity,
            tokenClassParticle.getAddress(),
            tokenClassParticle.getRRI(),
            {},
        )

        const createTokenParticleGroup = new RadixParticleGroup([
            RadixSpunParticle.down(rriParticle),
            RadixSpunParticle.up(tokenClassParticle),
            RadixSpunParticle.up(initialSupplyParticle),
        ])

        this.particleGroups.push(createTokenParticleGroup)

        return this
    }

    /**
     * Add a particle group to the atom which will create a new token with a variable supply
     * 
     * @param owner This will be the owner of the new token definition
     * @param name The name of the token
     * @param symbol The abbreviated symbol of the token, up to 14 alphanumeric characters long
     * @param description An extended description of the token
     * @param granularity Minimal indivisible amount of token that can be transacted. Every transaction must be a multiple of it
     * @param decimalQuantity The initial supply of the token
     * @param iconUrl A valid url cointaining the icon of the token
     * @param permissions Specify who can mint and burn the token
     */
    public createTokenMultiIssuance(
        owner: RadixAccount,
        name: string,
        symbol: string,
        description: string,
        granularity: string | number | Decimal = new Decimal('1e-18'),
        decimalQuantity: string | number | Decimal,
        iconUrl: string,
        url: string,
        permissions?: RadixTokenPermissions,
    ) {
        const subunitsQuantity = RadixTransactionBuilder.getSubUnitsQuantity(decimalQuantity)
        const subunitsGranularity = RadixTransactionBuilder.getSubUnitsQuantity(granularity)

        if (subunitsQuantity.lt(this.BNZERO)) {
            throw new Error('Negative quantity is not allowed')
        }

        if (subunitsGranularity.ltn(1)) {
            throw new Error('Granuarity has to be larger than or equal to 1e-18')
        }

        if (!subunitsQuantity.mod(subunitsGranularity).eq(this.BNZERO)) {
            throw new Error(`The initual supply should be a multiple of the token granularity = 
                ${RadixTokenDefinition.fromSubunitsToDecimal(subunitsGranularity)}`)
        }

        if (!permissions) {
            permissions = {
                mint: RadixTokenPermissionsValues.TOKEN_OWNER_ONLY,
                burn: RadixTokenPermissionsValues.TOKEN_OWNER_ONLY,
            }
        }

        if (permissions && permissions.mint === RadixTokenPermissionsValues.NONE) {
            throw new Error('mint permissions cannot be NONE')
        }

        const tokenClassParticle = new RadixMutableSupplyTokenDefinitionParticle(
            owner.address,
            name,
            symbol,
            description,
            subunitsGranularity,
            iconUrl,
            url,
            permissions)

        const rriParticle = new RadixRRIParticle(tokenClassParticle.getRRI())

        const initialSupplyParticle = new RadixUnallocatedTokensParticle(
            new BN(2).pow(new BN(256)).subn(1),
            subunitsGranularity,
            tokenClassParticle.getRRI(),
            permissions,
        )

        const createTokenParticleGroup = new RadixParticleGroup([
            RadixSpunParticle.down(rriParticle),
            RadixSpunParticle.up(tokenClassParticle),
            RadixSpunParticle.up(initialSupplyParticle),
        ])
        this.particleGroups.push(createTokenParticleGroup)

        if (subunitsQuantity.gtn(0)) {
            const mintParticle = new RadixTransferrableTokensParticle(
                subunitsQuantity,
                subunitsGranularity,
                owner.address,
                tokenClassParticle.getRRI(),
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
                    subunitsGranularity,
                    tokenClassParticle.getRRI(),
                    permissions,
                )
                mintParticleGroup.particles.push(RadixSpunParticle.up(remainingSupplyParticle))
            }

            this.particleGroups.push(mintParticleGroup)
        }

        return this
    }

    /**
     * Creates an atom storing arbitrary data on the ledger
     * 
     * @param from Author of the data, must sign the atom
     * @param recipients Everyone who will receive and be able to decrypt the message
     * @param applicationId An arbitrary string identifying your application, you can filter by this
     * @param payload The data to store 
     * @param [encrypted] If true the message will be encrypted using ECIES
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
     * Creates an atom which sends a Radix Message
     * @param from Author of the message, must sign the atom
     * @param to Recipient of the message
     * @param message Content of the message
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

    /**
     * Add a particle group to the atom which will send an encrypted message on the ledger to a number of recipients
     * 
     * @param from Author of the message
     * @param applicationId An arbitrary string identifying your application, you can filter by this
     * @param message Content of the message
     * @param recipients Everyone who will receive and be able to decrypt the message
     */
    public addEncryptedMessage(
        from: RadixAccount,
        applicationId: string,
        message: string,
        recipients: RadixAccount[],
    ) {
        const recipientPubKeys = recipients.map(r => r.address.getPublic())

        const { protectors, ciphertext } = RadixECIES.encryptForMultiple(recipientPubKeys, Buffer.from(message))

        this.addMessageParticle(
            from,
            JSON.stringify(protectors.map(p => p.toString('base64'))),
            {
                application: 'encryptor',
                contentType: 'application/json',
            },
            recipients,
        )

        if (this.particleGroups.length < 1) {
            throw new Error(`Expected at least one ParticleGroup`)
        }

        const lastParticleGroup = this.particleGroups[this.particleGroups.length - 1]

        this.addMessageParticle(
            from,
            ciphertext,
            {
                application: applicationId,
            },
            recipients,
            lastParticleGroup,
        )

        return this
    }


    /**
     * Add a particle group which will send an unencrypted message via the ledger to a number of recipients
     * 
     * @param from Author of the message. Must sign the atom
     * @param applicationId An arbitrary string identifying your application, you can filter by this
     * @param message Content of the message
     * @param recipients Everyone who will receive the message
     */
    public addUnencryptedMessage(
        from: RadixAccount,
        applicationId: string,
        message: string,
        recipients: RadixAccount[],
    ) {
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

    /**
     * Add a particle group to the atom containing a single MessageParticle
     * 
     * @param from Author of the message
     * @param data Content of the message particle
     * @param metadata Aa map of additional information
     * @param recipients A list of accounts which the message particle will be delivered to
     * @param toParticleGroup a specific Particle group you wanna insert the resulting particle in
     */
    public addMessageParticle(
        from: RadixAccount,
        data: string | Buffer,
        metadata: { [s: string]: string },
        recipients: RadixAccount[],
        toParticleGroup?: RadixParticleGroup,
    ) {

        if (recipients.length === 0) {
            throw new Error(`A message must have recipients`)
        }

        const particle = new RadixMessageParticle(
            from.address,
            (recipients.length === 1) ? recipients[0].address : recipients[1].address,
            data,
            metadata,
        )

        const spunParticle = RadixSpunParticle.up(particle)

        if (toParticleGroup) {
            toParticleGroup.particles.push(spunParticle)
        } else {
            const particleGroup = new RadixParticleGroup([spunParticle])
            this.particleGroups.push(particleGroup)
        }


        return this
    }

    /**
     * Add a particle which enforces that only one such particle can exists per account,
     * enforced on the ledger level
     * 
     * @param  {RadixAccount} account Scope of the uniqueness constraint
     * @param  {string} unique The unique identifier
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
     * @param identity An identity with an access to the private key
     * @returns a BehaviourSubject that streams the atom status updates
     */
    public signAndSubmit(identity: RadixIdentity): Observable<RadixAtomNodeStatusUpdate> {
        const atom = this.buildAtom()
       
        const stateSubject = new BehaviorSubject<RadixAtomNodeStatusUpdate>({
            status: RadixAtomNodeStatus.PENDING,
        })

        // Get node from universe
        radixUniverse.getNodeConnection()
            .then(connection => {
                this.subs.add(this.signAndSubmitAtom(atom, connection, identity)
                    .subscribe(stateSubject))
            }).catch(e => {
                logger.error(e)
                stateSubject.error({
                    status: RadixAtomNodeStatus.SUBMISSION_ERROR,
                    data: e,
                })
            })

        return stateSubject.pipe(share())
    }

    /**
     * Build an atom from the added particle groups
     */
    public buildAtom(): RadixAtom {
        if (this.particleGroups.length === 0) {
            throw new Error('No particle groups specified')
        }

        const atom = new RadixAtom()
        atom.particleGroups = this.particleGroups

        return atom
    }

    public addFeeToAtom(atom: RadixAtom, account: RadixAccount) {
        const xrdsToBurnBN = calculateFeeForAtom(atom)

        assertMinNativeTokenBalance(account, xrdsToBurnBN)

        const quantity = RadixTokenDefinition.fromSubunitsToDecimal(xrdsToBurnBN)

        this.burnTokens(
            account,
            radixUniverse.nativeToken,
            quantity,
        )
    }

    /**
     * Add a fee, sign the atom and submit it to a viable node in the network
     * 
     * @param atom The prepared atom 
     * @param connection Node connection it will be submitted to
     * @param identity An identity with an access to the private key
     */
    public signAndSubmitAtom(atom: RadixAtom, connection: RadixNodeConnection, identity: RadixIdentity) {
        this.addFeeToAtom(atom, identity.account)

        const statusSubject = new BehaviorSubject<RadixAtomNodeStatusUpdate>({
            status: RadixAtomNodeStatus.SUBMITTING,
        })

        identity.signAtom(atom)
            .then(signedAtom => {
                const submissionSubject = radixUniverse.ledger.submitAtom(signedAtom, connection)
                this.subs.add(submissionSubject.subscribe(statusSubject))
            }).catch(error => {
                statusSubject.error(error)
            })

        return statusSubject
    }
}

const assertMinNativeTokenBalance = (account: RadixAccount, requiredBalance: BN) => {
    const nativeTokenBalance = account.transferSystem.snapshotOfNativeTokenBalance()

    if (nativeTokenBalance.lt(requiredBalance)) {
        throw new Error(`${account.address.toString()} owns
             only ${RadixTokenDefinition.fromSubunitsToDecimal(nativeTokenBalance)} 
             XRDS but expected at least 
             ${RadixTokenDefinition.fromSubunitsToDecimal(requiredBalance)}
             `)
    }
    // ok!
}
