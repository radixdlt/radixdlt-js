import {
    includeDSON,
    includeJSON,
    RadixSerializer,
    RadixParticle,
    RadixAddress,
    RadixTokenClassReference,
    RadixFungibleType,
    RadixUInt256,
    RadixResourceIdentifier,
    RadixOwnable,
    RadixFungible,
} from '../..'

import BN from 'bn.js'

/**
 *  A particle which represents an amount of fungible tokens owned by some key owner and stored in an account.
 */
@RadixSerializer.registerClass('OWNEDTOKENSPARTICLE')
export class RadixOwnedTokensParticle extends RadixParticle implements RadixOwnable, RadixFungible {

    @includeDSON
    @includeJSON
    // tslint:disable-next-line:variable-name
    public token_reference: RadixResourceIdentifier

    @includeDSON
    @includeJSON
    public granularity: RadixUInt256

    @includeDSON
    @includeJSON
    public address: RadixAddress

    @includeDSON
    @includeJSON
    public planck: number

    @includeDSON
    @includeJSON
    public nonce: number

    @includeDSON
    @includeJSON
    public amount: RadixUInt256

    @includeDSON
    @includeJSON
    public type: RadixFungibleType

    constructor(
        amount: BN,
        granularity: BN,
        type: RadixFungibleType,
        address: RadixAddress,
        nonce: number,
        tokenReference: RadixTokenClassReference,
        planck?: number,
    ) {
        planck = planck ? planck : Math.floor(Date.now() / 60000 + 60000)

        super()

        this.address = address
        this.granularity = new RadixUInt256(granularity)
        this.token_reference = new RadixResourceIdentifier(tokenReference.address, 'tokenclasses', tokenReference.unique)
        this.amount = new RadixUInt256(amount)
        this.planck = planck
        this.nonce = nonce
        this.type = type
    }

    public getAddress() {
        return this.getAddresses()[0]
    }

    public getAddresses() {
        return [this.address]
    }

    public getType() {
        return this.type
    }

    public getPlanck() {
        return this.planck
    }

    public getNonce() {
        return this.nonce
    }

    public getTokenClassReference() {
        return this.token_reference
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
