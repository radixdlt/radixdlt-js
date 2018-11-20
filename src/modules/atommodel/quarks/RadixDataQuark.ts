import { RadixQuark, includeDSON, RadixSerializer, includeJSON, RadixBytes } from '../RadixAtomModel';

@RadixSerializer.registerClass('DATAQUARK')
export class RadixChronoQuark extends RadixQuark {
    
    @includeDSON
    @includeJSON
    public metaData: {string: string}


    @includeDSON
    @includeJSON
    public bytes: RadixBytes

}
