import BN from 'bn.js'

import { Decimal } from 'decimal.js'

import {
    includeDSON,
    includeJSON,
    RadixParticle,
    RadixSerializer,
    RadixAddress,
    RadixUInt256,
    RadixOwnable,
    RRI,
} from '../..'

export enum RadixTokenPermissionsValues {
    TOKEN_OWNER_ONLY = 'token_owner_only',
    ALL = 'all',
    NONE = 'none',
}

export interface RadixTokenPermissions {
    mint?: RadixTokenPermissionsValues,
    burn?: RadixTokenPermissionsValues,
}

/**
 * Particle defining a token
 */
@RadixSerializer.registerClass('radix.particles.mutable_supply_token_definition')
export class RadixMutableSupplyTokenDefinitionParticle extends RadixParticle implements RadixOwnable {

    

    @includeDSON
    @includeJSON
    public rri: RRI
    
    @includeDSON
    @includeJSON
    public name: string

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

        this.rri = new RRI(address, symbol)
        this.name = name
        this.description = description
        this.granularity = new RadixUInt256(granularity)
        this.iconUrl = iconUrl
        this.permissions = permissions
    }

    public getAddress() {
        return this.rri.getAddress()
    }

    public getSymbol() {
        return this.rri.getName()
    }

    public getAddresses() {
        return [this.getAddress()]
    }

    public getPermissions() {
        return this.permissions
    }

    public getGranularity(): BN {
        return this.granularity.value
    }

    public getOwner() {
        return this.getAddress()
    }

    public getRRI() {
        return this.rri
    }

    public getIconUrl() {
        return this.iconUrl
    }
}
