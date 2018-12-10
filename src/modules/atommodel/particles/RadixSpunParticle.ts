import { RadixParticle, RadixSerializableObject, RadixSerializer, includeJSON, includeDSON } from '..';

export enum RadixSpin {UP = 1, DOWN = 2}

@RadixSerializer.registerClass('SPUNPARTICLE')
export class RadixSpunParticle extends RadixSerializableObject {

    @includeJSON @includeDSON
    public particle: RadixParticle

    @includeJSON @includeDSON
    public spin: RadixSpin

    constructor(particle: RadixParticle, spin: RadixSpin) {
        super()
        this.particle = particle
        this.spin = spin
    }
}
