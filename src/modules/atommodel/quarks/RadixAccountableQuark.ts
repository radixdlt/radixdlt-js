import { RadixQuark, includeDSON, RadixAddress, RadixSerializer, includeJSON } from '../RadixAtomModel';

@RadixSerializer.registerClass('ACCOUNTABLEQUARK')
export class RadixAccountableQuark extends RadixQuark {
    
    @includeDSON
    @includeJSON
    public addresses: RadixAddress[]

}
