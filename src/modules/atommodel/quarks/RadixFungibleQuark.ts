import { RadixQuark, includeDSON, RadixSerializer, includeJSON, RadixBytes } from '../RadixAtomModel';

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
    public type: string
}
