import { RadixSerializer, 
    RadixParticle, 
    RadixAccountableQuark, 
    RadixAddress, 
    RadixTokenClassReference, 
    RadixOwnableQuark, 
    RadixFungibleQuark, 
    includeDSON, 
    includeJSON, 
    RadixFungibleType} from '../..'

/**
 *  A particle which represents an amount of fungible tokens owned by some key owner and stored in an account.
 */
@RadixSerializer.registerClass('OWNEDTOKENSPARTICLE')
export class RadixOwnedTokensParticle extends RadixParticle {

    @includeDSON
    @includeJSON
    // tslint:disable-next-line:variable-name
    public token_reference: RadixTokenClassReference

    constructor(amount: number, type: RadixFungibleType, address: RadixAddress, nonce: number, 
                tokenReference: RadixTokenClassReference, planck: number) {
        super(new RadixOwnableQuark(address.getPublic()), 
            new RadixAccountableQuark([address]),
            new RadixFungibleQuark(amount, planck, nonce, type))

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

}
