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
    RadixTokenClassReference, 
    RadixIdentifiableQuark} from '../..';
import { RadixResourceIdentifier } from '../../primitives/RadixResourceIdentifier';


export enum RadixTokenPermissionsValues {
    POW = 'pow',
    GENESIS_ONLY = 'genesis_only',
    SAME_ATOM_ONLY = 'same_atom_only',
    TOKEN_OWNER_ONLY = 'token_owner_only',
    ALL = 'all',
    NONE = 'none',
}

export interface RadixTokenPermissions {
    mint: RadixTokenPermissionsValues,
    transfer: RadixTokenPermissionsValues,
    burn: RadixTokenPermissionsValues,
}

/**
 * Particle defining a token
 */
@RadixSerializer.registerClass('TOKENCLASSPARTICLE')
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
    public permissions: RadixTokenPermissions

    constructor(
        address: RadixAddress, 
        name: string, 
        symbol: string, 
        description: string, 
        permissions: RadixTokenPermissions,
        icon: Buffer,
    ) {
        super(
            new RadixIdentifiableQuark(new RadixResourceIdentifier(address, 'tokenclasses', symbol)),
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
        const rri = this.getQuarkOrError(RadixIdentifiableQuark).id
        return new RadixTokenClassReference(rri.address, rri.unique)
    }

    public getPermissions(action: RadixFungibleType) {
        // Hack because it's 'mint' in permissions but 'minted' in OwnedTokensParticle
        return this.permissions[RadixFungibleType[(action as unknown as string)].toLowerCase()]
    }
}
