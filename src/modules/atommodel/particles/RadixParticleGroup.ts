import {
    includeDSON,
    includeJSON,
    RadixSerializableObject,
    RadixSpin,
    RadixAddress,
    RadixSpunParticle,
    RadixParticle,
    RadixSerializer,
} from '..'

@RadixSerializer.registerClass('radix.particle_group')
export class RadixParticleGroup extends RadixSerializableObject {

    @includeDSON
    @includeJSON
    public particles: RadixSpunParticle[]

    @includeDSON
    @includeJSON
    public metaData: {[s: string]: string}

    constructor(particles: RadixSpunParticle[] = [], metaData?: { [s: string]: string }) {
        super()
        this.particles = particles
        this.metaData = metaData
    }

    public getParticles() {
        return this.particles
    }

    public containsParticle(...types: Array<{ new(...args: any[]): RadixParticle }>) {
        for (const spunParticle of this.getParticles()) {
            for (const type of types) {
                if (spunParticle.particle instanceof type) {
                    return true
                }
            }
        }

        return false
    }
}
