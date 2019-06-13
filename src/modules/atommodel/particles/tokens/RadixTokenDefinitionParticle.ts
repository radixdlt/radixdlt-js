import BN from 'bn.js'

import { Decimal } from 'decimal.js'

import {
    includeDSON,
    includeJSON,
    RadixParticle,
    RadixSerializer,
    RadixFungibleType,
    RadixAddress,
    RadixUInt256,
    RadixOwnable,
    RRI,
} from '../..'

export enum RadixTokenPermissionsValues {
    TOKEN_CREATION_ONLY = 'token_creation_only',
    TOKEN_OWNER_ONLY = 'token_owner_only',
    ALL = 'all',
    NONE = 'none',
}

export interface RadixTokenPermissions {
    mint: RadixTokenPermissionsValues,
    burn: RadixTokenPermissionsValues,
}

/**
 * Particle defining a token
 */
@RadixSerializer.registerClass('radix.particles.token_definition')
export class RadixTokenDefinitionParticle extends RadixParticle implements RadixOwnable {

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

    @includeDSON
    @includeJSON
    public iconUrl: string

    constructor(
        address: RadixAddress,
        name: string,
        symbol: string,
        description: string,
        granularity: BN,
        iconUrl: string,
        permissions: RadixTokenPermissions,
    ) {
        super()

        this.address = address
        this.name = name
        this.symbol = symbol
        this.description = description
        this.granularity = new RadixUInt256(granularity)
        this.iconUrl = iconUrl
        this.permissions = permissions
    }

    public getAddresses() {
        return [this.address]
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

    public getRRI() {
        return new RRI(this.address, this.symbol)
    }

    public getTokenDefinitionReference() {
        return this.getRRI()
    }

    public getIconUrl() {
        return this.iconUrl
    }
}
