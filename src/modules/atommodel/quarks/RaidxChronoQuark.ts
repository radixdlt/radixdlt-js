import { RadixQuark, includeDSON, RadixSerializer, includeJSON } from '../RadixAtomModel';

@RadixSerializer.registerClass('CHRONOQUARK')
export class RadixChronoQuark extends RadixQuark {
    
    @includeDSON
    @includeJSON
    public timestampKey: string


    @includeDSON
    @includeJSON
    public timestampValue: number

}
