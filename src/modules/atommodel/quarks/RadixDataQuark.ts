import { RadixQuark, includeDSON, RadixSerializer, includeJSON, RadixBytes } from '../RadixAtomModel';


/**
 * Particle which is responsible for holding arbitrary data, possibly encrypted
 */
@RadixSerializer.registerClass('DATAQUARK')
export class RadixDataQuark extends RadixQuark {
    
    @includeDSON
    @includeJSON
    public metaData: {[s: string]: string}


    @includeDSON
    @includeJSON
    public bytes: RadixBytes

    constructor(data: string | Buffer, metaData: {[s: string]: string}) {
        super()
        this.bytes = new RadixBytes(data)
        this.metaData = metaData
    }

}
