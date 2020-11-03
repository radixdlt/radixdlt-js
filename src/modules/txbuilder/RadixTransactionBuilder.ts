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

import { BehaviorSubject } from 'rxjs'
import Decimal from 'decimal.js'
import BN from 'bn.js'

import {
    radixUniverse,
    RadixSignatureProvider,
    RadixAccount,
    RadixFeeProvider,
    RadixNodeConnection,
    RadixParticleGroup,
    RadixAtomNodeStatusUpdate,
    RadixAtomNodeStatus,
} from '../..'

import {
    RadixSpunParticle,
    RadixAtom,
    RadixTokenPermissions,
    RadixTokenPermissionsValues,
    RadixUnallocatedTokensParticle,
    RadixTransferrableTokensParticle,
    RadixUniqueParticle,
    RRI,
    RadixRRIParticle,
    RadixMutableSupplyTokenDefinitionParticle,
    RadixFixedSupplyTokenDefinitionParticle,
} from '../atommodel'

import { logger } from '../common/RadixLogger'
import { RadixTokenDefinition, RadixTokenSupplyType } from '../token/RadixTokenDefinition'
import { sendMessageActionToParticleGroup } from '../messaging/SendMessageActionToParticleGroupsMapper'
import SendMessageAction, { encryptedTextDecryptableBySenderAndRecipientMessageAction } from '../messaging/SendMessageAction'


export default class RadixTransactionBuilder {
    private BNZERO: BN = new BN(0)

    private particleGroups: RadixParticleGroup[] = []

    private getSubUnitsQuantity(decimalQuantity: Decimal.Value): BN {
        if (typeof decimalQuantity !== 'number' && typeof decimalQuantity !== 'string' && !Decimal.isDecimal(decimalQuantity)) {
            throw new Error('quantity is not a valid number')
        }
        const unitsQuantity = new Decimal(decimalQuantity)
        const subunitsQuantity = RadixTokenDefinition.fromDecimalToSubunits(unitsQuantity)
        return subunitsQuantity
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

        const subunitsQuantity = this.getSubUnitsQuantity(decimalQuantity)

        if (subunitsQuantity.lt(this.BNZERO)) {
            throw new Error('Negative quantity is not allowed')
        } else if (subunitsQuantity.eq(this.BNZERO)) {
            throw new Error(`Quantity 0 is not valid`)
        }

        const transferSystem = from.transferSystem

        if (subunitsQuantity.gt(transferSystem.balance[tokenReference.toString()])) {
            throw new Error('Insufficient funds')
        }

        const unspentConsumables = transferSystem.getUnspentConsumables()

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

        this.particleGroups.push(createTransferAtomParticleGroup)

        if (message) {
            const encryptedMessageParticleGroup = sendMessageActionToParticleGroup(
                encryptedTextDecryptableBySenderAndRecipientMessageAction(
                    from.address,
                    to.address,
                    message,
                ),
            )

            this.particleGroups.push(encryptedMessageParticleGroup)
        }


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
        const subunitsQuantity = this.getSubUnitsQuantity(decimalQuantity)

        if (subunitsQuantity.lt(this.BNZERO)) {
            throw new Error('Negative quantity is not allowed')
        } else if (subunitsQuantity.eq(this.BNZERO)) {
            throw new Error(`Quantity 0 is not valid`)
        }

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

        const subunitsQuantity = this.getSubUnitsQuantity(decimalQuantity)

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
                    Date.now(),
                    tokenReference,
                    tokenPermissions,
                )))
        }

        const receiverAccount = to || ownerAccount

        const transferrableTokensParticle = new RadixTransferrableTokensParticle(
            subunitsQuantity,
            tokenClass.getGranularity(),
            receiverAccount.address,
            Date.now(),
            tokenReference,
            tokenPermissions,
        )


        particleGroup.particles.push(RadixSpunParticle.up(transferrableTokensParticle))

        this.particleGroups.push(particleGroup)

        if (to && message) {
            const encryptedMessageParticleGroup = sendMessageActionToParticleGroup(
                encryptedTextDecryptableBySenderAndRecipientMessageAction(
                    ownerAccount.address,
                    to.address,
                    message,
                ),
            )

            this.particleGroups.push(encryptedMessageParticleGroup)
        }

        return this
    }

    public sendMessage(action: SendMessageAction): RadixTransactionBuilder {
        this.particleGroups.push(
            sendMessageActionToParticleGroup(
                action,
            ),
        )
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
        const subunitsQuantity = this.getSubUnitsQuantity(decimalQuantity)
        const subunitsGranularity = this.getSubUnitsQuantity(granularity)

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
            Date.now(),
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
        const subunitsQuantity = this.getSubUnitsQuantity(decimalQuantity)
        const subunitsGranularity = this.getSubUnitsQuantity(granularity)

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
            Date.now(),
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
                Date.now(),
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
                    Date.now(),
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
     * @param signer An identity with an access to the private key
     * @returns a BehaviourSubject that streams the atom status updates
     */
    public signAndSubmit(signer: RadixSignatureProvider) {
        const atom = this.buildAtom()

        const stateSubject = new BehaviorSubject<RadixAtomNodeStatusUpdate>({
            status: RadixAtomNodeStatus.PENDING,
        })

        // Get node from universe
        radixUniverse.getNodeConnection()
            .then(connection => {
                RadixTransactionBuilder.signAndSubmitAtom(atom, connection, signer)
                    .subscribe(stateSubject)
            }).catch(e => {
                logger.error(e)
                stateSubject.error({
                    status: RadixAtomNodeStatus.SUBMISSION_ERROR,
                    data: e,
                })
            })

        return stateSubject
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

    /**
     * Add a fee, sign the atom and submit it to a viable node in the network
     * 
     * @param atom The prepared atom 
     * @param connection Node connection it will be submitted to
     * @param signer An identity with an access to the private key
     */
    public static signAndSubmitAtom(atom: RadixAtom, connection: RadixNodeConnection, signer: RadixSignatureProvider) {
        const statusSubject = new BehaviorSubject<RadixAtomNodeStatusUpdate>({
            status: RadixAtomNodeStatus.SUBMITTING,
        })

        // Remove earlier POW fee if any
        atom.clearPowNonce()

        RadixFeeProvider.generatePOWFee(
            radixUniverse.universeConfig.getMagic(),
            atom,
        ).then(pow => {
            atom.setPowNonce(pow.nonce)
            return signer.signAtom(atom)
        }).then(signedAtom => {
            const submissionSubject = radixUniverse.ledger.submitAtom(signedAtom, connection)
            submissionSubject.subscribe(statusSubject)
        }).catch(error => {
            statusSubject.error(error)
        })

        return statusSubject
    }
}
