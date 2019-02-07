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
    RadixSpin,
    RadixOwnedTokensParticle,
    RadixFungibleType,
    RadixTimestampParticle,
    RadixTokenClassParticle,
    RadixTokenPermissions,
    RadixTokenPermissionsValues,
} from '../atommodel'

import { logger } from '../common/RadixLogger'
import { RadixTokenClass } from '../token/RadixTokenClass'
import { RadixResourceIdentifier } from '../atommodel/primitives/RadixResourceIdentifier';

export default class RadixTransactionBuilder {
    private particles: RadixSpunParticle[] = []
    private participants: TSMap<string, RadixAccount> = new TSMap()

    private particleGroups: RadixParticleGroup[] = []

    private getSubUnitsQuantity(tokenClass: RadixTokenClass, decimalQuantity: Decimal.Value): BN {
        if (typeof decimalQuantity !== 'number' && typeof decimalQuantity !== 'string' && !Decimal.isDecimal(decimalQuantity)) {
            throw new Error('quantity is not a valid number')
        }

        const unitsQuantity = new Decimal(decimalQuantity)

        if (!tokenClass) {
            throw new Error('Token information not loaded')
        }

        const subunitsQuantity = tokenClass.fromDecimalToSubunits(unitsQuantity)

        const bnzero = new BN(0)
        const dczero = new Decimal(0)
        if (subunitsQuantity.lt(bnzero)) {
            throw new Error('Negative quantity is not allowed')
            // } else if (subunitsQuantity.eq(bnzero) && unitsQuantity.greaterThan(dczero)) {
            //     const decimalPlaces = 18 // TODO: update to granularity
            //     throw new Error(`You can only specify up to ${decimalPlaces} decimal places`)
        } else if (!subunitsQuantity.mod(tokenClass.getGranularity()).eq(new BN(0))) {
            throw new Error(`This token requires that any amount is a multiple of it's granularity = ${tokenClass.getGranularity()}`)
        } else if (subunitsQuantity.eq(bnzero) && unitsQuantity.eq(dczero)) {
            throw new Error(`Quantity 0 is not valid`)
        }

        return subunitsQuantity
    }

    /**
     * Creates transfer atom
     * @param from Sender account, needs to have RadixAccountTransferSystem
     * @param to Receiver account
     * @param tokenReferenceURI TokenClassReference string
     * @param decimalQuantity
     * @param [message] Optional reference message
     */
    public static createTransferAtom(
        from: RadixAccount,
        to: RadixAccount,
        tokenReferenceURI: string | RadixTokenClass,
        decimalQuantity: number | string | Decimal,
        message?: string,
    ) {
        return new RadixTransactionBuilder().addTransfer(from, to, tokenReferenceURI, decimalQuantity, message)
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
        tokenReferenceURI: string | RadixTokenClass,
        decimalQuantity: number | string | Decimal,
        message?: string,
    ) {
        // const tokenReference = RadixTokenClassReference.fromString(tokenReferenceURI)
        const tokenReference = (tokenReferenceURI instanceof RadixTokenClass)
            ? new RadixTokenClassReference(tokenReferenceURI.address, tokenReferenceURI.symbol)
            : RadixTokenClassReference.fromString(tokenReferenceURI)

        // const tokenClass = from.tokenClassSystem.getTokenClass(tokenReferenceURI)
        const tokenClass = (tokenReferenceURI instanceof RadixTokenClass)
            ? tokenReferenceURI
            : radixTokenManager.getTokenClassNoLoad(tokenReferenceURI)

        const subunitsQuantity = this.getSubUnitsQuantity(tokenClass, decimalQuantity)

        const transferSytem = from.transferSystem

        // const subunitsQuantity = new BN(1)
        if (subunitsQuantity.gt(transferSytem.balance[tokenReference.toString()])) {
            console.log(subunitsQuantity.toString())
            throw new Error('Insufficient funds')
        }

        const unspentConsumables = transferSytem.getUnspentConsumables()

        const createTransferAtomParticleGroup = new RadixParticleGroup()
        createTransferAtomParticleGroup.particles = []

        const consumerQuantity = new BN(0)
        for (const consumable of unspentConsumables) {
            const rri: RadixResourceIdentifier = consumable.getTokenClassReference()
            if (!RadixTokenClassReference.fromString(rri.toString()).equals(tokenReference)) {
                continue
            }

            createTransferAtomParticleGroup.particles.push(new RadixSpunParticle(consumable, RadixSpin.DOWN))

            consumerQuantity.iadd(consumable.getAmount())
            if (consumerQuantity.gte(subunitsQuantity)) {
                break
            }
        }

        createTransferAtomParticleGroup.particles.push(new RadixSpunParticle(
            new RadixOwnedTokensParticle(
                subunitsQuantity,
                tokenClass.getGranularity(),
                RadixFungibleType.TRANSFER,
                to.address,
                Date.now(),
                tokenReference,
            ),
            RadixSpin.UP))

        // Remained to myself
        if (consumerQuantity.sub(subunitsQuantity).gten(0)) {
            createTransferAtomParticleGroup.particles.push(new RadixSpunParticle(
                new RadixOwnedTokensParticle(
                    consumerQuantity.sub(subunitsQuantity),
                    tokenClass.getGranularity(),
                    RadixFungibleType.TRANSFER,
                    from.address,
                    Date.now(),
                    tokenReference,
                ),
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

        this.particleGroups.push(createTransferAtomParticleGroup)

        return this
    }

    public burnTokens(ownerAccount: RadixAccount, tokenReferenceURI: string, decimalQuantity: string | number | Decimal) {
        const tokenReference = RadixTokenClassReference.fromString(tokenReferenceURI)
        const tokenClass = ownerAccount.tokenClassSystem.getTokenClass(tokenReferenceURI)
        const subunitsQuantity = this.getSubUnitsQuantity(tokenClass, decimalQuantity)

        const transferSytem = ownerAccount.transferSystem

        if (subunitsQuantity.gt(transferSytem.balance[tokenReferenceURI])) {
            throw new Error('Insufficient funds')
        }

        const unspentConsumables = transferSytem.getUnspentConsumables()

        const consumerQuantity = new BN(0)
        for (const consumable of unspentConsumables) {
            const rri: RadixResourceIdentifier = consumable.getTokenClassReference()
            if (!RadixTokenClassReference.fromString(rri.toString()).equals(tokenReference)) {
                continue
            }

            const consumableParticleGroup = new RadixParticleGroup()
            consumableParticleGroup.particles = [new RadixSpunParticle(consumable, RadixSpin.DOWN)]
            this.particleGroups.push(consumableParticleGroup)

            consumerQuantity.iadd(consumable.getAmount())
            if (consumerQuantity.gte(subunitsQuantity)) {
                break
            }
        }

        const ownedTokensParticleGroup = new RadixParticleGroup()
        ownedTokensParticleGroup.particles = [new RadixSpunParticle(
            new RadixOwnedTokensParticle(
                subunitsQuantity,
                tokenClass.getGranularity(),
                RadixFungibleType.BURN,
                ownerAccount.address,
                Date.now(),
                tokenReference,
            ),
            RadixSpin.UP)]
        this.particleGroups.push(ownedTokensParticleGroup)

        // Remained to myself
        if (consumerQuantity.sub(subunitsQuantity).gtn(0)) {
            const ownedTokensParticleGroupRemanent = new RadixParticleGroup()
            ownedTokensParticleGroupRemanent.particles = [new RadixSpunParticle(
                new RadixOwnedTokensParticle(
                    consumerQuantity.sub(subunitsQuantity),
                    tokenClass.getGranularity(),
                    RadixFungibleType.TRANSFER,
                    ownerAccount.address,
                    Date.now(),
                    tokenReference,
                ),
                RadixSpin.UP)]
            this.particleGroups.push(ownedTokensParticleGroupRemanent)
        }

        this.participants.set(ownerAccount.getAddress(), ownerAccount)

        return this
    }

    public mintTokens(ownerAccount: RadixAccount, tokenReferenceURI: string, decimalQuantity: string | number | Decimal) {
        const tokenReference = RadixTokenClassReference.fromString(tokenReferenceURI)
        const tokenClass = ownerAccount.tokenClassSystem.getTokenClass(tokenReference.symbol)
        const subunitsQuantity = this.getSubUnitsQuantity(tokenClass, decimalQuantity)

        if (tokenClass.totalSupply.add(subunitsQuantity).gte(new BN(2).pow(new BN(256)))) {
            throw new Error('Total supply would exceed 2^256')
        }

        this.participants.set(ownerAccount.getAddress(), ownerAccount)

        const particle = new RadixOwnedTokensParticle(
            subunitsQuantity,
            tokenClass.getGranularity(),
            RadixFungibleType.MINT,
            ownerAccount.address,
            Date.now(),
            RadixTokenClassReference.fromString(tokenReferenceURI),
        )

        const particleParticleGroup = new RadixParticleGroup()
        particleParticleGroup.particles = [new RadixSpunParticle(particle, RadixSpin.UP)]
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
        // TODO: this is a hack, the subunits calculation can probably be moved out of the token class if it's constant
        const tokenClass = new RadixTokenClass(owner.address, symbol, name, description, granularity)
        const tokenAmount = this.getSubUnitsQuantity(tokenClass, decimalQuantity)

        this.participants.set(owner.getAddress(), owner)

        const tokenClassParticle = new RadixTokenClassParticle(
            owner.address,
            name,
            symbol,
            description,
            granularity,
            permissions)

        const createTokenParticleGroup = new RadixParticleGroup()
        createTokenParticleGroup.particles = [new RadixSpunParticle(tokenClassParticle, RadixSpin.UP)]

        if (tokenAmount.gten(0)) {
            const mintParticle = new RadixOwnedTokensParticle(
                tokenAmount,
                granularity,
                RadixFungibleType.MINT,
                owner.address,
                Date.now(),
                tokenClassParticle.getTokenClassReference(),
            )

            createTokenParticleGroup.particles.push(new RadixSpunParticle(mintParticle, RadixSpin.UP))
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
            mint: RadixTokenPermissionsValues.SAME_ATOM_ONLY,
            transfer: RadixTokenPermissionsValues.ALL,
            burn: RadixTokenPermissionsValues.NONE,
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
            data,
            metadata,
            recipients.map(account => account.address),
        )

        const particleParticleGroup = new RadixParticleGroup()
        particleParticleGroup.particles = [new RadixSpunParticle(particle, RadixSpin.UP)]
        this.particleGroups.push(particleParticleGroup)

        return this
    }

    /**
     * Builds the atom, finds a node to submit to, adds network fee, signs the atom and submits
     * @param signer
     * @returns a BehaviourSubject that streams the atom status updates
     */
    public signAndSubmit(signer: RadixSignatureProvider) {
        if (this.particleGroups.length === 0) {
            throw new Error('No particles specified')
        }

        const atom = new RadixAtom()

        atom.particleGroups = this.particleGroups

        // Add timestamp
        const timestampParticleGroup = new RadixParticleGroup()
        timestampParticleGroup.particles = [new RadixSpunParticle(new RadixTimestampParticle(Date.now()), RadixSpin.UP)]
        atom.particleGroups.push(timestampParticleGroup)

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
                const powFeeParticleGroup = new RadixParticleGroup()
                powFeeParticleGroup.particles = [new RadixSpunParticle(powFeeParticle, RadixSpin.UP)]
                atom.particleGroups.push(powFeeParticleGroup)

                // Sign atom
                stateSubject.next('SIGNING')
                return signer.signAtom(atom)
            })
            .then(_signedAtom => {
                signedAtom = _signedAtom

                logger.debug(signedAtom.hid.toString())

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
                submissionSubject.subscribe({
                    error: error => {
                        logger.info('Problem submitting atom, deleting', error)
                        // Delete atom from participant accounts
                        for (const participant of this.participants.values()) {
                            participant._onAtomReceived({
                                action: 'DELETE',
                                atom: signedAtom,
                                processedData: {},
                            })
                        }
                    }
                })
            })
            .catch(error => {
                stateSubject.error(error)
            })

        return stateSubject
    }
}
