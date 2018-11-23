import { RadixQuark, includeDSON, RadixSerializer, includeJSON, RadixBytes } from '../RadixAtomModel';


export enum RadixFungibleType {
    MINT = 'mint',
    TRANSFER = 'transfer',
    BURN = 'burn',
}


/**
 * A quark that makes a particle fungible: can be cut up into pieces and put back together.
 */
@RadixSerializer.registerClass('FUNGIBLEQUARK')
export class RadixFungibleQuark extends RadixQuark {
    
    @includeDSON
    @includeJSON
    public planck: number


    @includeDSON
    @includeJSON
    public nonce: number

    @includeDSON
    @includeJSON
    public amount: number

    @includeDSON
    @includeJSON
    public type: RadixFungibleType

    constructor(amount: number, planck: number, nonce: number, type: RadixFungibleType) {
        super()
        this.amount = amount
        this.planck = planck
        this.nonce = nonce
        this.type = type
    }
}
