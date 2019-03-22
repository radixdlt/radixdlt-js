import {
    includeDSON,
    includeJSON,
    RadixSerializer,
    RadixParticle,
    RadixAddress,
    RadixTokenDefinitionReference,
    RadixFungibleType,
    RadixUInt256,
    RadixResourceIdentifier,
    RadixOwnable,
    RadixFungible,
} from '../..'

import BN from 'bn.js'

/**
 *  A particle which represents an amount of consuming, burned fungible tokens
 *  owned by some key owner and stored in an account.
 */
@RadixSerializer.registerClass('BURNEDTOKENSPARTICLE')
export class RadixBurnedTokensParticle extends RadixParticle implements RadixOwnable, RadixFungible {

    @includeDSON
    @includeJSON
    public address: RadixAddress
    
    @includeDSON
    @includeJSON
    public tokenDefinitionReference: RadixResourceIdentifier

    @includeDSON
    @includeJSON
    public granularity: RadixUInt256

    @includeDSON
    @includeJSON
    public planck: number

    @includeDSON
    @includeJSON
    public nonce: number

    @includeDSON
    @includeJSON
    public amount: RadixUInt256

    constructor(
        amount: BN,
        granularity: BN,
        address: RadixAddress,
        nonce: number,
        tokenReference: RadixTokenDefinitionReference,
        planck?: number,
    ) {
        planck = planck ? planck : Math.floor(Date.now() / 60000 + 60000)

        super()

        this.address = address
        this.granularity = new RadixUInt256(granularity)
        this.tokenDefinitionReference = new RadixResourceIdentifier(tokenReference.address, 'tokens', tokenReference.unique)
        this.amount = new RadixUInt256(amount)
        this.planck = planck
        this.nonce = nonce
    }

    public getAddress() {
        return this.address
    }

    public getAddresses() {
        return [this.address]
    }

    public getType() {
        return RadixFungibleType.BURN
    }

    public getPlanck() {
        return this.planck
    }

    public getNonce() {
        return this.nonce
    }

    public getTokenDefinitionReference() {
        return this.tokenDefinitionReference
    }

    public getOwner() {
        return this.address
    }

    public getAmount() {
        return this.amount.value
    }

    public getGranularity(): BN {
        return this.granularity.value
    }
}
