import { RadixParticle, RadixSerializableObject, RadixSerializer, includeJSON, includeDSON } from '..';

export enum RadixSpin {UP = 1, DOWN = -1}

@RadixSerializer.registerClass('radix.spun_particle')
export class RadixSpunParticle extends RadixSerializableObject {

    @includeJSON
    @includeDSON
    public particle: RadixParticle

    @includeJSON
    @includeDSON
    public spin: RadixSpin

    constructor(particle: RadixParticle, spin: RadixSpin) {
        super()
        this.particle = particle
        this.spin = spin
    }

    public static up(particle: RadixParticle) {
        return new this(particle, RadixSpin.UP)
    }

    public static down(particle: RadixParticle) {
        return new this(particle, RadixSpin.DOWN)
    }
}
