/*
 * (C) Copyright 2020 Radix DLT Ltd
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the “Software”),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

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
    RadixParticleGroup,
    RadixAID,
} from '..'

import { StringifySet } from '../../common/StringifySet'

@RadixSerializer.registerClass('radix.atom')
export class RadixAtom extends RadixSerializableObject {
    // TODO: serializer id for atoms is temporarily excluded from hash for compatibility with abstract atom
    // See RadixSerializableObject::encodeCBOR()

    public static METADATA_POW_NONCE_KEY = 'powNonce'

    @includeJSON
    @includeDSON
    public particleGroups: RadixParticleGroup[] = []

    @includeJSON
    public signatures: { [id: string]: RadixECSignature }

    @includeDSON
    @includeJSON
    public metaData: {[s: string]: string} = {}

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
        const addressSet = new StringifySet<RadixAddress>()

        for (const particleGroup of this.particleGroups) {
            for (const particle of particleGroup.particles) {

                if(particle.particle.serializer === 'radix.particles.system_particle') continue
                if(particle.particle.serializer === 'radix.particles.unregistered_validator') continue
                if(particle.particle.serializer === 'radix.particles.registered_validator') continue
                if(particle.particle.serializer === 'radix.particles.staked_tokens') continue
                if(particle.particle.serializer === ':str:radix.particles.system_particle') continue

                const addresses = particle.particle.getAddresses()
                for (const address of addresses) {
                    addressSet.add(address)
                }
            }
        }

        return addressSet.values()
    }

    public setPowNonce(nonce: Long) {
        this.metaData[RadixAtom.METADATA_POW_NONCE_KEY] = nonce.toString()
    }

    public clearPowNonce() {
        delete this.metaData[RadixAtom.METADATA_POW_NONCE_KEY]
    }

    public getSpunParticlesOfType(...types: Array<new (...args: any[]) => RadixParticle>) {
        return this.getParticles()
            .filter(s => {
                for (const type of types) {
                    if (s.particle instanceof type) {
                        return true
                    }
                }
            })
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

    public containsParticle(...types: Array<new(...args: any[]) => RadixParticle>) {
        for (const spunParticle of this.getParticles()) {
            for (const type of types) {
                if (spunParticle.particle instanceof type) {
                    return true
                }
            }
        }

        return false
    }

    public getParticleGroups() {
        return this.particleGroups
    }

    public getAid() {
        return RadixAID.from(this.getHash())
    }

    public getAidString() {
        return this.getAid().toString()
    }
}
