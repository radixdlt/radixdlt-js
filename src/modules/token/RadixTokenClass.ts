import BN from 'bn.js'
import { Decimal } from 'decimal.js'

import { RadixAccount, RadixUInt256 } from '../..'
import { RadixAddress } from '../atommodel'

export enum RadixTokenSupplyType {
    FIXED = 'fixed',
    MUTABLE = 'mutable',
    POW = 'pow',
}

export class RadixTokenClass {
    // All radix tokens are store with 18 subunits
    public static SUBUNITS = new Decimal(10).pow(18)

    public address: RadixAddress
    public symbol: string

    public name: string
    public description: string
    public totalSupply: BN = new BN(0)
    public tokenSupplyType: RadixTokenSupplyType
    public granularity: RadixUInt256

    constructor(
        address: RadixAddress, 
        symbol: string, 
        name?: string, 
        description?: string,
        granularity?: BN,
        tokenSupplyType?: RadixTokenSupplyType,
        totalSupply?: BN,
    ) {
        this.address = address
        this.symbol = symbol

        if (name) {this.name = name}
        if (description) {this.description = description}
        if (tokenSupplyType) {this.tokenSupplyType = tokenSupplyType}
        if (totalSupply) {this.totalSupply = totalSupply}
        if (granularity) {this.granularity = new RadixUInt256(granularity)}
    }

    /**
     * Convert actual decimal token amount to integer subunits stored on the ledger
     * @param amount 
     * @returns subunits 
     */
    public fromDecimalToSubunits(amount: string | number | Decimal): BN {
        const inUnits = new Decimal(amount)

        return new BN(inUnits
            .times(RadixTokenClass.SUBUNITS)
            .truncated()
            .toString(), 10)
    }

    /**
     * Convert subunits token amount to actual decimal token amount
     * @param amount 
     * @returns token units 
     */
    public fromSubunitsToDecimal(amount: BN): Decimal {
        const inSubunits = new Decimal(amount.toString(10))

        return inSubunits
            .dividedBy(RadixTokenClass.SUBUNITS)
    }

    public addTotalSupply(difference: number | BN) {
        this.totalSupply.iadd(new BN(difference))
    }

    public getGranularity(): BN {
        return this.granularity.value
    }
}
