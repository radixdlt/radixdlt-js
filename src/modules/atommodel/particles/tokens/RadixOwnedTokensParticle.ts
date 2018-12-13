import { RadixSerializer, 
    RadixParticle, 
    RadixAccountableQuark, 
    RadixAddress, 
    RadixTokenClassReference, 
    RadixOwnableQuark, 
    RadixFungibleQuark, 
    includeDSON, 
    includeJSON, 
    RadixFungibleType,
    RadixUInt256} from '../..'

import BN from 'bn.js'

/**
 *  A particle which represents an amount of fungible tokens owned by some key owner and stored in an account.
 */
@RadixSerializer.registerClass('OWNEDTOKENSPARTICLE')
export class RadixOwnedTokensParticle extends RadixParticle {

    @includeDSON
    @includeJSON
    // tslint:disable-next-line:variable-name
    public token_reference: RadixTokenClassReference

    constructor(amount: BN, type: RadixFungibleType, address: RadixAddress, nonce: number, 
                tokenReference: RadixTokenClassReference, planck?: number,
    ) {
        planck = planck ? planck : Math.floor(Date.now() / 60000 + 60000)
        
        super(new RadixOwnableQuark(address.getPublic()), 
            new RadixAccountableQuark([address]),
            new RadixFungibleQuark(new RadixUInt256(amount), planck, nonce, type))

        this.token_reference = tokenReference
    }

    public getAddress() {
        return this.getAddresses()[0]
    }

    public getAddresses() {
        return this.getQuarkOrError(RadixAccountableQuark).addresses
    }

    public getType() {
        return this.getQuarkOrError(RadixFungibleQuark).type
    }

    public getPlanck() {
        return this.getQuarkOrError(RadixFungibleQuark).planck
    }

    public getNonce() {
        return this.getQuarkOrError(RadixFungibleQuark).nonce
    }

    public getTokenClassReference() {
        return this.token_reference
    }

    public getOwner() {
        return this.getQuarkOrError(RadixOwnableQuark).owner
    }

    public getAmount() {
        return this.getQuarkOrError(RadixFungibleQuark).amount.value
    }

}
