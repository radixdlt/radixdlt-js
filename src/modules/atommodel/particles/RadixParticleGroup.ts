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

    public getParticlesOfType<T extends RadixParticle>(type: new (...args: any[]) => T, spin?: RadixSpin): T[] {
        let particles = this.getParticles()
            .filter(spunParticle => spunParticle.particle instanceof type)

        if (spin) {
            particles = particles.filter(spunParticle => spunParticle.spin === spin)
        }

        return particles.map(spunParticle => spunParticle.particle) as T[]
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
