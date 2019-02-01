import {
    includeJSON,
    includeDSON,
    RadixSerializableObject,
    RadixSpunParticle,
    RadixECSignature,
    RadixSerializer,
    RadixAddress,
    RadixSpin,
    RadixParticle,
    RadixTimestampParticle,
    RadixParticleGroup,
} from '..'

import { TSMap } from 'typescript-map'

@RadixSerializer.registerClass('ATOM')
export class RadixAtom extends RadixSerializableObject {

    @includeJSON
    @includeDSON
    public particleGroups: RadixParticleGroup[]

    @includeJSON
    public signatures: { [id: string]: RadixECSignature }

    public getParticles(): RadixSpunParticle[] {
        const particles = []

        for (const particleGroup of this.particleGroups) {
            for (const particle of particleGroup.particles) {
                particles.push(particle)
            }
        }

        return particles
    }

    public getAddresses() {
        const addressMap = new TSMap<RadixAddress, any>()

        for (const particle of this.getParticles()) {
            const addresses = particle.particle.getAddresses()
            for (const address of addresses) {
                addressMap.set(address, '')
            }
        }

        return addressMap.keys()
    }

    public getTimestamp(): number {
        return this.getFirstParticleOfType(RadixTimestampParticle).getTimestamp()
    }

    public getSpunParticlesOfType(type: new (...args: any[]) => RadixParticle) {
        return this.getParticles()
            .filter(s => s.particle instanceof type)
    }


    public getParticlesOfSpin(spin: RadixSpin) {
        return this.getParticles()
            .filter(spunParticle => spunParticle.spin === spin)
            .map(spunParticle => spunParticle.particle)
    }

    public getParticlesOfType<T extends RadixParticle>(type: new (...args: any[]) => T, spin?: RadixSpin): T[] {
        let particles = this.getParticles()
            .filter(spunParticle => spunParticle.particle instanceof type)

        if (spin) {
            particles = particles.filter(spunParticle => spunParticle.spin === spin)
        }

        return particles.map(spunParticle => spunParticle.particle) as T[]
    }

    public getFirstParticleOfType<T extends RadixParticle>(type: new (...args: any[]) => T): T {
        return this.getParticles()
            .find(spunParticle => spunParticle.particle instanceof type).particle as T
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
