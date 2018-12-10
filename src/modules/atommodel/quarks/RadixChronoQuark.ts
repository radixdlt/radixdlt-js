import { RadixQuark, includeDSON, RadixSerializer, includeJSON } from '..';


/**
 * A quark that keeps a specific timestamp.
 * Currently used to keep atom-specific timestamps in TimestampParticle.
 */
@RadixSerializer.registerClass('CHRONOQUARK')
export class RadixChronoQuark extends RadixQuark {
    
    @includeDSON
    @includeJSON
    public timestamps: {[key: string]: number} = {}

    constructor(timestampKey: string, timestampValue: number) {
        super()

        this.timestamps[timestampKey] = timestampValue
    }

    public getTimestamp(key: string) {
        if (!(key in this.timestamps)) {
            throw new Error(`No timestamp '${key}' in quark`)
        }

        return this.timestamps[key]
    }

}
