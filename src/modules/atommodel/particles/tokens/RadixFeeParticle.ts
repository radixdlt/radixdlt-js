import {
    RadixSerializer,
    RadixAddress,
    RadixTokenClassReference,
    includeDSON,
    includeJSON,
    RadixEUID,
    RadixOwnedTokensParticle,
    RadixFungibleType,
    RadixUInt256
} from '../..'

import BN from 'bn.js'

/**
 * Particle representing the network fee
 */
@RadixSerializer.registerClass('FEEPARTICLE')
export class RadixFeeParticle extends RadixOwnedTokensParticle {

    @includeDSON
    @includeJSON
    public service: RadixEUID

    constructor(
        amount: BN,
        address: RadixAddress,
        nonce: number,
        tokenReference: RadixTokenClassReference,
        planck: number,
    ) {
        super(amount, new BN(1), RadixFungibleType.MINT, address, nonce, tokenReference, planck)

        this.service = new RadixEUID(1)
    }

}
