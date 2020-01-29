/*
 * (C) Copyright 2020 Radix DLT Ltd
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the “Software”),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

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

        if (supply.lten(0)) {
            throw new Error('Supply has to be larger than 0')
        }

        if (granularity.lten(0)) {
            throw new Error('Granularity has to be larger than 0')
        }

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
