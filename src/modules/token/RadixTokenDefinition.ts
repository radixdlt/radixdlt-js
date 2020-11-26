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

import { RadixUInt256 } from '../..'
import { RadixAddress, RadixUnallocatedTokensParticle } from '../atommodel'
import { TSMap } from 'typescript-map'

export enum RadixTokenSupplyType {
    FIXED = 'fixed',
    MUTABLE = 'mutable',
}

const NonExpDecimal = Decimal.clone({ toExpPos: 9e15, toExpNeg: -9e15 })

export class RadixTokenDefinition {

    // All radix tokens are store with 18 subunits
    public static SUBUNITS = new Decimal(10).pow(18)

    public address: RadixAddress
    public symbol: string
    public name: string
    public description: string
    public totalSupply: BN = new BN(0)
    public tokenSupplyType: RadixTokenSupplyType
    public granularity: RadixUInt256
    public unallocatedTokens: TSMap<string, RadixUnallocatedTokensParticle> = new TSMap()
    public iconUrl: string

    constructor(
        address: RadixAddress,
        symbol: string,
        name?: string,
        description?: string,
        granularity = new BN(1),
        tokenSupplyType?: RadixTokenSupplyType,
        totalSupply?: BN,
        unallocatedTokens?: TSMap<string, RadixUnallocatedTokensParticle>,
        iconUrl?: string,
    ) {
        this.address = address
        this.symbol = symbol

        if (name) { this.name = name }
        if (description) { this.description = description }
        if (tokenSupplyType) { this.tokenSupplyType = tokenSupplyType }
        if (totalSupply) { this.totalSupply = totalSupply }
        if (granularity) { this.granularity = new RadixUInt256(granularity) }
        if (unallocatedTokens) { this.unallocatedTokens = unallocatedTokens }
        if (iconUrl) { this.iconUrl = iconUrl }
    }

    /**
     * Convert actual decimal token amount to integer subunits stored on the ledger
     * @param amount 
     * @returns subunits 
     */
    public static fromDecimalToSubunits(amount: string | number | Decimal): BN {
        const inUnits = new NonExpDecimal(amount)

        return new BN(inUnits
            .times(this.SUBUNITS)
            .truncated()
            .toString(), 10)
    }

    /**
     * Convert subunits token amount to actual decimal token amount
     * @param amount 
     * @returns token units 
     */
    public static fromSubunitsToDecimal(amount: BN): Decimal {
        const inSubunits = new NonExpDecimal(amount.toString(10))

        return new Decimal(inSubunits.dividedBy(this.SUBUNITS))
    }

    public addTotalSupply(difference: number | BN) {
        this.totalSupply.iadd(new BN(difference))
    }

    public getTotalSupply(): BN {
        return this.totalSupply
    }

    public getTokenUnitsTotalSupply(): Decimal {
        return RadixTokenDefinition.fromSubunitsToDecimal(this.getTotalSupply())
    }

    public getGranularity(): BN {
        return this.granularity.value
    }

    public getTokenUnitsGranularity(): Decimal {
        return RadixTokenDefinition.fromSubunitsToDecimal(this.getGranularity())
    }

    public getUnallocatedTokens() {
        return this.unallocatedTokens.values()
    }

    public getUnallocatedSupply() {
        const supply = new BN(0)
        for (const unallocatedTokens of this.getUnallocatedTokens()) {
            supply.iadd(unallocatedTokens.getAmount())
        }
        return supply
    }
}
