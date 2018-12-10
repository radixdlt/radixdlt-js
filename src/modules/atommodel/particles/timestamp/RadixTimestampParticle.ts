import { RadixSerializer, RadixParticle, RadixChronoQuark } from '../..'

/**
 * Particle which stores time related aspects of an atom.
 */
@RadixSerializer.registerClass('TIMESTAMPPARTICLE')
export class RadixTimestampParticle extends RadixParticle {

    constructor(timestamp: number) {
        super(new RadixChronoQuark('default', timestamp))
    }

    public getAddresses() {
        return []
    }

    public getTimestamp() {
        return this.getQuarkOrError(RadixChronoQuark).getTimestamp('default')
    }

}
