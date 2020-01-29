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
import { RadixIdentityManager, RadixTransactionBuilder } from '../..'
import { RadixAtom, RadixAddress } from '../atommodel'

describe('RadixSimpleIdentity', () => {

    it('different identities leave different signatures on atom', async () => {
        const atom1 = new RadixAtom()
        const atom2 = new RadixAtom()
        const manager = new RadixIdentityManager()
        const identity1 = manager.generateSimpleIdentity()
        const identity2 = manager.generateSimpleIdentity()

        await identity1.signAtom(atom1)
        await identity2.signAtom(atom2)

        const signature1 = atom1.signatures[identity1.address.getUID().toString()]
        const signature2 = atom2.signatures[identity2.address.getUID().toString()]

        expect(signature2).to.not.deep.equal(signature1)
    })

    it('identities from same seed leave same signature on atom', async () => {
        const seed = 'abc'
        const atom1 = new RadixAtom()
        const atom2 = new RadixAtom()
        const manager = new RadixIdentityManager()
        const identity1 = manager.generateSimpleIdentityFromSeed(Buffer.from(seed))
        const identity2 = manager.generateSimpleIdentityFromSeed(Buffer.from(seed))

        await identity1.signAtom(atom1)
        await identity2.signAtom(atom2)

        const signature1 = atom1.signatures[identity1.address.getUID().toString()]
        const signature2 = atom2.signatures[identity2.address.getUID().toString()]

        expect(signature2).to.deep.equal(signature1)
    })

    it('signature of seeded identity can be verified OK', async () => {
        const seed = 'def'
        const atom1 = new RadixAtom()
        const atom2 = new RadixAtom()
        const manager = new RadixIdentityManager()
        const identity1 = manager.generateSimpleIdentityFromSeed(Buffer.from(seed))
        const identity2 = manager.generateSimpleIdentityFromSeed(Buffer.from(seed))

        await identity1.signAtom(atom1)
        await identity2.signAtom(atom2)

        const signature2 = atom2.signatures[identity2.address.getUID().toString()]

        // Since identity2 should be the same as identity1, identity2's signature
        // should also be verified OK on atom1, even though the atom was signed
        // with identity1.
        expect(identity1.address.verify(atom1.getHash(), signature2)).to.equal(true)
    })

})
