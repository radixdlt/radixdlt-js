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

/**
 * Particle defining a fixed supply token
 */
@RadixSerializer.registerClass('radix.particles.fixed_supply_token_definition')
export class RadixFixedSupplyTokenDefinitionParticle extends RadixParticle implements RadixOwnable {

    

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
    public supply: RadixUInt256

    @includeDSON
    @includeJSON
    public granularity: RadixUInt256

    @includeDSON
    @includeJSON
    public iconUrl: string

    constructor(
        address: RadixAddress,
        name: string,
        symbol: string,
        description: string,
        supply: BN,
        granularity: BN,
        iconUrl: string,
    ) {
        super()

        this.rri = new RRI(address, symbol)
        this.name = name
        this.description = description
        this.supply = new RadixUInt256(supply)
        this.granularity = new RadixUInt256(granularity)
        this.iconUrl = iconUrl
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

    public getRRI() {
        return this.rri
    }

    public getSupply(): BN {
        return this.supply.getValue()
    }

    public getGranularity(): BN {
        return this.granularity.getValue()
    }

    public getOwner() {
        return this.getAddress()
    }

    public getIconUrl() {
        return this.iconUrl
    }
}
