import { RadixQuark, includeDSON, RadixSerializer, includeJSON } from '../RadixAtomModel';


/**
 * A quark that keeps a specific timestamp.
 * Currently used to keep atom-specific timestamps in TimestampParticle.
 */
@RadixSerializer.registerClass('CHRONOQUARK')
export class RadixChronoQuark extends RadixQuark {
    
    @includeDSON
    @includeJSON
    public timestampKey: string


    @includeDSON
    @includeJSON
    public timestampValue: number

    constructor(timestampKey: string, timestampValue: number) {
        super()
        this.timestampKey = timestampKey
        this.timestampValue = timestampValue
    }

}
