import {
    includeDSON,
    includeJSON,
    RadixSerializer,
    RadixParticle,
    RadixAddress,
    RadixTokenClassReference,
    RadixEUID,
    RadixMintedTokensParticle,
} from '../..'

import BN from 'bn.js'

/**
 *  A particle which represents a fee on the network
 */
@RadixSerializer.registerClass('FEEPARTICLE')
export class RadixFeeParticle extends RadixMintedTokensParticle {

    @includeDSON
    @includeJSON
    public service: RadixEUID

    constructor(
        amount: BN,
        address: RadixAddress,
        nonce: number,
        tokenReference: RadixTokenClassReference,
        planck?: number,
    ) {
        super(amount, new BN(1), address, nonce, tokenReference, planck)

        this.service = new RadixEUID(1)
    }

   
}
