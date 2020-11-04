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
import { RadixIdentityManager, RadixParticleGroup, RadixSpunParticle, RadixTransactionBuilder, RadixUniqueParticle } from '../..'
import { RadixAtom, RadixAddress } from '../atommodel'
import RadixSimpleIdentity from './RadixSimpleIdentity'
import PrivateKey from '../crypto/PrivateKey'
import { generateNewAddressWithRandomMagic } from '../atommodel/primitives/RadixAddress.spec'

describe('RadixSimpleIdentity', () => {

    const alice = RadixSimpleIdentity.fromPrivate(1)
    const bob = RadixSimpleIdentity.fromPrivate(2)

    const particleGroup = new RadixParticleGroup([
        RadixSpunParticle.up(
            new RadixUniqueParticle(generateNewAddressWithRandomMagic(), 'Foo'),
        ),
    ])

    const makeAtom = (): RadixAtom => {
        return RadixAtom.withParticleGroup(particleGroup)
    }

    it('different identities leave different signatures on atom', async () => {
        const signature1 = alice.signAtom(makeAtom())
        const signature2 = bob.signAtom(makeAtom())
        expect(signature2).to.not.deep.equal(signature1)
    })

    it('same identities leave same signature on atom', async () => {
        const signature1 = alice.signAtom(makeAtom())
        const signature2 = alice.signAtom(makeAtom())
        expect(signature2).to.deep.equal(signature1)
    })

    it('signature can be verified', async () => {
        const signature1 = alice.signAtom(makeAtom())
        const signature2 = bob.signAtom(makeAtom())


        // Since identity2 should be the same as identity1, identity2's signature
        // should also be verified OK on atom1, even though the atom was signed
        // with identity1.
        // expect(identity1.address.verify(atom1.getHash(), signature2)).to.equal(true)
    })

})
