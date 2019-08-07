import {
    includeDSON,
    includeJSON,
    RadixSerializer,
    RadixParticle,
    RadixAddress,
    RadixUInt256,
    RRI,
    RadixOwnable,
    RadixFungible,
    RadixConsumable,
    RadixTokenPermissions,
} from '../..'

import BN from 'bn.js'

/**
 *  A particle which represents an amount of unallocated tokens which can be minted.
 */
@RadixSerializer.registerClass('radix.particles.unallocated_tokens')
export class RadixUnallocatedTokensParticle extends RadixParticle implements RadixOwnable, RadixFungible, RadixConsumable {

    @includeDSON
    @includeJSON
    public tokenDefinitionReference: RRI

    @includeDSON
    @includeJSON
    public granularity: RadixUInt256

    @includeDSON
    @includeJSON
    public nonce: number

    @includeDSON
    @includeJSON
    public amount: RadixUInt256

    @includeDSON
    @includeJSON
    public permissions: RadixTokenPermissions

    constructor(
        amount: BN,
        granularity: BN,
        nonce: number,
        tokenReference: RRI,
        tokenPermissions: RadixTokenPermissions,
    ) {
        if (amount.isZero()) {
            throw new Error('Ammount cannot be zero')
        }

        super()
        
        this.granularity = new RadixUInt256(granularity)
        this.tokenDefinitionReference = tokenReference
        this.amount = new RadixUInt256(amount)
        this.nonce = nonce
        this.permissions = tokenPermissions
    }

    public getAddress() {
        return this.tokenDefinitionReference.address
    }

    public getAddresses() {
        return [this.tokenDefinitionReference.address]
    }

    public getNonce() {
        return this.nonce
    }

    public getTokenDefinitionReference() {
        return this.tokenDefinitionReference
    }

    public getOwner() {
        return this.getAddress()
    }

    public getAmount() {
        return this.amount.value
    }

    public getGranularity(): BN {
        return this.granularity.value
    }

    public getTokenPermissions() {
        return this.permissions
    }
}
