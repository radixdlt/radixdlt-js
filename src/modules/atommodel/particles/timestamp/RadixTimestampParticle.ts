import { RadixSerializer, RadixParticle, includeDSON, includeJSON } from '../..'

/**
 * Particle which stores time related aspects of an atom.
 */
@RadixSerializer.registerClass('TIMESTAMPPARTICLE')
export class RadixTimestampParticle extends RadixParticle {

    private static DEFAULT_KEY = 'default'

    @includeDSON
    @includeJSON
    public timestamps: { [key: string]: number } = {}

    constructor(timestamp: number) {
        super()
        this.timestamps[RadixTimestampParticle.DEFAULT_KEY] = timestamp
    }

    public getAddresses() {
        return []
    }

    public getTimestamp() {
        return this.timestamps[RadixTimestampParticle.DEFAULT_KEY]
    }

}
