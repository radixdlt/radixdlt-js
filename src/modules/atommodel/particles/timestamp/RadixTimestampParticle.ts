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
        const chronoQuarks = this.getQuarks(RadixChronoQuark)
        for (const quark of chronoQuarks) {
            if (quark.timestampKey === 'default') {
                return quark.timestampValue
            }
        }

        throw new Error(`Particle doesn't contain timestamp "default"`)
    }

}
