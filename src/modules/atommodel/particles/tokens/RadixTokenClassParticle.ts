// import BN from 'bn.js'
import { Decimal } from 'decimal.js'

import {
    includeDSON,
    includeJSON,
    RadixParticle,
    RadixSerializer,
    RadixBytes,
    RadixFungibleType,
    RadixAddress,
    RadixAccountableQuark,
    RadixOwnableQuark,
    RadixUInt256,
    // RadixNonFungibleQuark,
    RadixTokenClassReference,
    RadixIdentifiableQuark,
} from '../..'

import { RadixResourceIdentifier } from '../../primitives/RadixResourceIdentifier'

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
    public symbol: string

    @includeDSON
    @includeJSON
    public description: string

    @includeDSON
    @includeJSON
    public granularity: RadixUInt256

    @includeDSON
    @includeJSON
    public permissions: RadixTokenPermissions

    constructor(
        address: RadixAddress,
        name: string,
        symbol: string,
        description: string,
        granularity: RadixUInt256,
        permissions: RadixTokenPermissions,
    ) {
        super(
            new RadixAccountableQuark([address]),
            new RadixOwnableQuark(address.getPublic()),
        )

        this.name = name
        this.symbol = symbol
        this.description = description
        this.granularity = granularity
        this.permissions = permissions
    }

    public getAddresses() {
        return [this.getQuarkOrError(RadixAccountableQuark).addresses[0]]
    }

    public getTokenClassReference(): RadixTokenClassReference {
        // const rri = this.getQuarkOrError(RadixIdentifiableQuark).id
        // return new RadixTokenClassReference(rri.address, rri.unique)
        return new RadixTokenClassReference(this.getQuarkOrError(RadixAccountableQuark).getAddresses()[0], this.symbol)
    }

    public getPermissions(action: RadixFungibleType) {
        // Hack because it's 'mint' in permissions but 'minted' in OwnedTokensParticle
        return this.permissions[RadixFungibleType[(action as unknown as string)].toLowerCase()]
    }
}
