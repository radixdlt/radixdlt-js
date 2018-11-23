import { RadixParticle, 
    RadixSerializer,
    includeDSON, 
    includeJSON, 
    RadixBytes, 
    RadixFungibleType, 
    RadixAddress, 
    RadixAccountableQuark, 
    RadixOwnableQuark, 
    RadixNonFungibleQuark, 
    RadixTokenClassReference } from '../../RadixAtomModel';


export enum RadixTokenPermissions {
    POW = 'pow',
    GENESIS_ONLY = 'genesis_only',
    SAME_ATOM_ONLY = 'same_atom_only',
    TOKEN_OWNER_ONLY = 'token_owner_only',
    ALL = 'all',
    NONE = 'none',
}

/**
 * Particle defining a token
 */
@RadixSerializer.registerClass('FEEPARTICLE')
export class RadixTokenClassParticle extends RadixParticle {

    @includeDSON
    @includeJSON
    public name: string
    
    @includeDSON
    @includeJSON
    public description: string
    
    @includeDSON
    @includeJSON
    public icon: RadixBytes

    @includeDSON
    @includeJSON
    public permissions: {[action: string]: RadixTokenPermissions}

    constructor(address: RadixAddress, name: string, symbol: string, description: string, 
                permissions: {[action: string]: RadixTokenPermissions},
                icon: Buffer) {
        super(
            new RadixNonFungibleQuark(new RadixTokenClassReference(address, symbol)),
            new RadixAccountableQuark([address]),
            new RadixOwnableQuark(address.getPublic()),
        )

        this.name = name
        this.description = description
        this.permissions = permissions
        this.icon = new RadixBytes(icon)
    }

    public getAddresses() {
        return [this.getQuarkOrError(RadixAccountableQuark).addresses[0]]
    }

    public getTokenClassReference(): RadixTokenClassReference {
        return this.getQuarkOrError(RadixNonFungibleQuark).index as RadixTokenClassReference
    }
}
