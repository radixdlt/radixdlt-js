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

import { expect } from 'chai'
import 'mocha'
import { RadixAtom, RadixParticleGroup, RadixUniqueParticle, RadixAddress } from '.'
import { RadixSpunParticle } from './particles/RadixSpunParticle';


describe('Radix Atom model', () => {

    
    {
        const atom = new RadixAtom()
        const address1 = RadixAddress.generateNew()
        const address2 = RadixAddress.generateNew()

        atom.particleGroups = [new RadixParticleGroup([
            RadixSpunParticle.up(new RadixUniqueParticle(address1, 'test')),
            RadixSpunParticle.up(new RadixUniqueParticle(address2, 'test2')),
        ])]

        it(`should compute addresses`, () => {
            const addresses = atom.getAddresses()
            
            expect(addresses).to.deep.equal([address1, address2])
        })

        it(`should compute AID`, () => {
            const aid = atom.getAid()
            expect(aid.toString()).to.be.lengthOf(64)
        })
    }

    
})
