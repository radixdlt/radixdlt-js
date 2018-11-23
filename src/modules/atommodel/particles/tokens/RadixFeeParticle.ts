import { RadixSerializer, 
    RadixAddress, 
    RadixTokenClassReference, 
    includeDSON, 
    includeJSON, 
    RadixEUID,
    RadixOwnedTokensParticle,
    RadixFungibleType} from '../../RadixAtomModel'

/**
 * Particle representing the network fee
 */
@RadixSerializer.registerClass('FEEPARTICLE')
export class RadixFeeParticle extends RadixOwnedTokensParticle {

    @includeDSON
    @includeJSON
    public service: RadixEUID

    constructor(amount: number, type: RadixFungibleType, address: RadixAddress, nonce: number, 
                tokenReference: RadixTokenClassReference, planck: number) {
        super(amount, type, address, nonce, tokenReference, planck)

        this.service = new RadixEUID(1)
    }

}
