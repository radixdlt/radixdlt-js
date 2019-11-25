import { BehaviorSubject } from 'rxjs'
import { TSMap } from 'typescript-map'

import Decimal from 'decimal.js'
import BN from 'bn.js'

import {
    radixUniverse,
    RadixSignatureProvider,
    RadixAccount,
    RadixTransferAccountSystem,
    RadixFeeProvider,
    RadixNodeConnection,
    RadixECIES,
    RadixParticleGroup,
    RadixAtomNodeStatusUpdate,
    RadixAtomNodeStatus,
    RadixTokenDefinitionAccountSystem,
} from '../..'

import {
    RadixAddress,
    RadixSpunParticle,
    RadixAtom,
    RadixMessageParticle,
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

import { RadixTokenDefinition, RadixTokenSupplyType } from '../token/RadixTokenDefinition'
import { AtomOperation, AccountState, createInitialState, LedgerState } from '../account/types'
import { TransferState } from '../account/RadixTransferAccountSystem'
import { TokenDefinitionState } from '../account/RadixTokenDefinitionAccountSystem'

export default class RadixTransactionBuilder {
    private BNZERO: BN = new BN(0)

    private particleGroups: RadixParticleGroup[] = []
    private actions: Function[] = []
    private accounts: RadixAccount[] = []

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

        const executeAction = (state: LedgerState): LedgerState => {
            const accountState = state[from.getAddress()]

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

            if (subunitsQuantity.gt(accountState.balance[tokenReference.toString()])) {
                throw new Error('Insufficient funds')
            }

            const createTransferAtomParticleGroup = new RadixParticleGroup()

            const consumerQuantity = new BN(0)
            let granularity = new BN(1)
            let tokenPermissions
            for (const consumable of accountState.unspentConsumables.values()) {
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

            if (message) {
                this.addEncryptedMessage(from,
                    'transfer',
                    message,
                    [to, from])
            }

            this.particleGroups.push(createTransferAtomParticleGroup)

            RadixTransferAccountSystem.processParticleGroups(
                [createTransferAtomParticleGroup],
                AtomOperation.STORE,
                from.address,
                accountState
            )

            return state
        }

        this.addAction(from, executeAction)
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

        const executeAction = (state: LedgerState): LedgerState => {
            const accountState = state[ownerAccount.getAddress()]

            tokenReference = (tokenReference instanceof RRI)
                ? tokenReference
                : RRI.fromString(tokenReference)

            const tokenClass = accountState.tokenDefinitions.get(tokenReference.getName())
            const subunitsQuantity = this.getSubUnitsQuantity(decimalQuantity)

            if (subunitsQuantity.lt(this.BNZERO)) {
                throw new Error('Negative quantity is not allowed')
            } else if (subunitsQuantity.eq(this.BNZERO)) {
                throw new Error(`Quantity 0 is not valid`)
            }

            if (tokenClass.tokenSupplyType !== RadixTokenSupplyType.MUTABLE) {
                throw new Error('This token is fixed supply')
            }

            if (subunitsQuantity.gt(accountState.balance[tokenReference.toString()])) {
                throw new Error('Insufficient funds')
            }

            if (!subunitsQuantity.mod(tokenClass.getGranularity()).eq(this.BNZERO)) {
                throw new Error(`This token requires that any tranferred amount is a multiple of it's granularity = 
                ${RadixTokenDefinition.fromSubunitsToDecimal(tokenClass.getGranularity())}`)
            }

            const unspentConsumables = accountState.unspentConsumables.values()

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
            return state
        }

        this.addAction(ownerAccount, executeAction)
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

        const executeAction = (state: LedgerState): LedgerState => {
            const accountState = state[ownerAccount.getAddress()]

            tokenReference = (tokenReference instanceof RRI)
                ? tokenReference
                : RRI.fromString(tokenReference)

            let tokenDefinition = accountState.tokenDefinitions.get(tokenReference.getName())

            if (!tokenDefinition) {
                throw new Error(`ERROR: Token definition ${tokenReference.getName()} not found in owner account.`)
            }

            const subunitsQuantity = this.getSubUnitsQuantity(decimalQuantity)

            if (subunitsQuantity.lt(this.BNZERO)) {
                throw new Error('Negative quantity is not allowed')
            } else if (subunitsQuantity.eq(this.BNZERO)) {
                throw new Error(`Quantity 0 is not valid`)
            }

            if (tokenDefinition.tokenSupplyType !== RadixTokenSupplyType.MUTABLE) {
                console.log('fixed supply error')
                throw new Error('This token is fixed supply')
            }

            if (subunitsQuantity.gte(tokenDefinition.getUnallocatedSupply())) {
                throw new Error('Total supply would exceed 2^256')
            }


            if (!subunitsQuantity.mod(tokenDefinition.getGranularity()).eq(this.BNZERO)) {
                throw new Error(`This token requires that any tranferred amount is a multiple of it's granularity = 
                ${RadixTokenDefinition.fromSubunitsToDecimal(tokenDefinition.getGranularity())}`)
            }

            const unallocatedTokens = tokenDefinition.getUnallocatedTokens()
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
                        tokenDefinition.getGranularity(),
                        Date.now(),
                        tokenReference,
                        tokenPermissions,
                    )))
            }

            const receiverAccount = to || ownerAccount

            const particle = new RadixTransferrableTokensParticle(
                subunitsQuantity,
                tokenDefinition.getGranularity(),
                receiverAccount.address,
                Date.now(),
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

            RadixTransferAccountSystem.processParticleGroups(
                [particleGroup],
                AtomOperation.STORE,
                ownerAccount.address,
                accountState
            )

            this.particleGroups.push(particleGroup)

            RadixTokenDefinitionAccountSystem.processParticleGroups(this.particleGroups, AtomOperation.STORE, accountState)

            return state
        }

        this.addAction(ownerAccount, executeAction)
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
        iconUrl: string,
    ) {
        const executeAction = (state: LedgerState) => {
            const accountState = state[owner.getAddress()]

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
                iconUrl)
    
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

            RadixTokenDefinitionAccountSystem.processParticleGroups(this.particleGroups, AtomOperation.STORE, accountState)
            RadixTransferAccountSystem.processParticleGroups(this.particleGroups, AtomOperation.STORE, owner.address, accountState)

            return state
        }

        this.addAction(owner, executeAction)
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
        permissions?: RadixTokenPermissions) {

        const executeAction = (state: LedgerState): LedgerState => {
            const accountState = state[owner.getAddress()]

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


            RadixTokenDefinitionAccountSystem.processParticleGroups(this.particleGroups, AtomOperation.STORE, accountState)
            RadixTransferAccountSystem.processParticleGroups(this.particleGroups, AtomOperation.STORE, owner.address, accountState)
            
            return state
        }

        this.addAction(owner, executeAction)
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
     */
    public addMessageParticle(from: RadixAccount, data: string | Buffer, metadata: {}, recipients: RadixAccount[]) {
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

    // system param will be of type AcccountSystem when getState has been implemented everywhere.
    /*
    private setState(state: LedgerState, account: RadixAccount) {
        let newState = {}
        const address = account.getAddress()

        newState[address] = state ? { ...state[address] } : createInitialState()

        Object.keys(newState[address]).forEach((key) => {
            account.accountSystems.forEach((system, name) => {
                // Temporarily only use the systems that have been refactored so far
                if(['TRANSFER','TOKENS'].includes(system.name)) {
                    newState[address][key] = newState[address][key] ? newState[address][key] : system.getState()[key]
                }
            })
        })
        return newState
    }
    */

    private addAction(account: RadixAccount, action: Function) {
        this.accounts.push(account)
        this.actions.push(action)
    }

    private executeActions(actions) {
        actions.reduce((prev, fn) => {
            return fn(prev)
        }, this.getInitialState(this.accounts))

        this.actions = []
    }

    private getInitialState(accounts: RadixAccount[]): LedgerState {
        let state = {}
        accounts.forEach(account => {
            account.accountSystems.forEach((system) => {
                state[account.getAddress()] = {
                    ...state[account.getAddress()],
                    ...system.getState()
                }
            })
        })
        return state
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

        // Find a shard, any of the participant shards is ok
        const shard = atom.getShards()[0]

        // Get node from universe
        radixUniverse.getNodeConnection(shard)
            .then(connection => {
                RadixTransactionBuilder.signAndSubmitAtom(atom, connection, signer)
                    .subscribe(stateSubject)
            })

        return stateSubject
    }

    /**
     * Build an atom from the added particle groups
     */
    public buildAtom(): RadixAtom {
        this.executeActions(this.actions)

        if (this.particleGroups.length === 0) {
            throw new Error('No particle groups specified')
        }

        const atom = new RadixAtom()
        atom.particleGroups = this.particleGroups

        // Add timestamp
        atom.setTimestamp(Date.now())
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

        // Add POW fee
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
