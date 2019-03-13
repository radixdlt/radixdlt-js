import BN from 'bn.js'

import { Decimal } from 'decimal.js'

import {
    includeDSON,
    includeJSON,
    RadixParticle,
    RadixSerializer,
    RadixBytes,
    RadixFungibleType,
    RadixAddress,
    RadixUInt256,
    RadixTokenClassReference,
    RadixIdentifiableQuark,
    RadixOwnable,
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
export class RadixTokenClassParticle extends RadixParticle implements RadixOwnable {

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

    @includeDSON
    @includeJSON
    public address: RadixAddress

    constructor(
        address: RadixAddress,
        name: string,
        symbol: string,
        description: string,
        granularity: BN,
        permissions: RadixTokenPermissions,
    ) {
        super()

        this.address = address
        this.name = name
        this.symbol = symbol
        this.description = description
        this.granularity = new RadixUInt256(granularity)
        this.permissions = permissions
    }

    public getAddresses() {
        return [this.address]
    }

    public getTokenClassReference(): RadixTokenClassReference {
        return new RadixTokenClassReference(this.address, this.symbol)
    }

    public getPermissions(action: RadixFungibleType) {
        // Hack because it's 'mint' in permissions but 'minted' in OwnedTokensParticle
        return this.permissions[RadixFungibleType[(action as unknown as string)].toLowerCase()]
    }

    public getGranularity(): BN {
        return this.granularity.value
    }

    public getOwner() {
        return this.address
    }
}
