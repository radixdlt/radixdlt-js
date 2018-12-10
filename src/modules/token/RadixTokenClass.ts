import { Decimal } from 'decimal.js'
import BN from 'bn.js'

export enum RadixTokenSupplyType {
    FIXED = 'fixed',
    MUTABLE = 'mutable',
    POW = 'pow',
}

export class RadixTokenClass {
    // All radix tokens are store with 18 subunits
    public static SUBUNITS = new Decimal(10).pow(18)

    public name: string
    public description: string
    public symbol: string
    public icon: Buffer
    public totalSupply: BN = new BN(0)
    public tokenSupplyType: RadixTokenSupplyType

    constructor() {
        //
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
            .toHex(), 16)
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
}
