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
import { RadixIdentityManager, RadixTransactionBuilder, RadixAccount, RadixAtomNodeStatus } from '../..'
import { RadixAtom, RadixAddress } from '../atommodel'
import { RadixNEDBAtomStore } from './RadixNEDBAtomStore';
import { encryptedTextDecryptableBySenderAndRecipientMessageAction } from '../messaging/SendMessageAction'

describe('RadixNEDBAtomStore', () => {

    it('should not insert twice', async () => {
        const atomStore = new RadixNEDBAtomStore({inMemoryOnly: true})

        const alice = new RadixAccount(RadixAddress.generateNew())

        const atom1 = new RadixTransactionBuilder()
            .sendMessage(
                encryptedTextDecryptableBySenderAndRecipientMessageAction(
                    alice.address,
                    alice.address,
                    'Note to self: my name is Alice - in case I would forget',
                ),
            )
            .buildAtom()

        return atomStore.insert(atom1, {status: RadixAtomNodeStatus.STORED}).then((inserted) => {
            expect(inserted).to.be.true

            return atomStore.insert(atom1, {status: RadixAtomNodeStatus.STORED})
        }).then((inserted) => {
            expect(inserted).to.be.false
        })
    })

    it('should query all atoms', (done) => {
        const atomStore = new RadixNEDBAtomStore({inMemoryOnly: true})

        const alice = new RadixAccount(RadixAddress.generateNew())
        const bob = new RadixAccount(RadixAddress.generateNew())

        const atom1 = new RadixTransactionBuilder()
            .sendMessage(
                encryptedTextDecryptableBySenderAndRecipientMessageAction(
                    alice.address,
                    alice.address,
                    'Note to self: my name is Alice - in case I would forget',
                ),
            )
            .buildAtom()

        const atom2 = new RadixTransactionBuilder()
            .sendMessage(
                encryptedTextDecryptableBySenderAndRecipientMessageAction(
                    alice.address,
                    bob.address,
                    'Hey Bob, this is Alice!',
                ),
            )
            .buildAtom()

        
        atomStore.insert(atom1, {status: RadixAtomNodeStatus.STORED})
        .then((inserted) => {
            expect(inserted).to.be.true

            return atomStore.insert(atom2, {status: RadixAtomNodeStatus.STORED})
        }).then((inserted) => {
            expect(inserted).to.be.true

            const atoms = []

            atomStore.getStoredAtomObservations().subscribe({
                next: (atom) => {
                    atoms.push(atom)
                },
                complete: () => {
                    expect(atoms).to.be.of.length(2)
                    done()
                }
            })
        })
    })

    it('should query atoms by addresses', (done) => {
        const atomStore = new RadixNEDBAtomStore({inMemoryOnly: true})

        const alice = new RadixAccount(RadixAddress.generateNew())
        const bob = new RadixAccount(RadixAddress.generateNew())

        const atom1 = new RadixTransactionBuilder()
            .sendMessage(
                encryptedTextDecryptableBySenderAndRecipientMessageAction(
                    alice.address,
                    alice.address,
                    'Note to self: my name is Alice - in case I would forget',
                ),
            )
            .buildAtom()

        const atom2 = new RadixTransactionBuilder()
            .sendMessage(
                encryptedTextDecryptableBySenderAndRecipientMessageAction(
                    alice.address,
                    bob.address,
                    'Hey Bob, this is Alice!',
                ),
            )
            .buildAtom()

        
        atomStore.insert(atom1, {status: RadixAtomNodeStatus.STORED})
        .then((inserted) => {
            expect(inserted).to.be.true

            return atomStore.insert(atom2, {status: RadixAtomNodeStatus.STORED})
        }).then((inserted) => {
            expect(inserted).to.be.true

            const aliceAtoms = []

            atomStore.getStoredAtomObservations(alice.address).subscribe({
                next: (atom) => {
                    aliceAtoms.push(atom)
                },
                complete: () => {
                    expect(aliceAtoms).to.be.of.length(2)
                    done()
                }
            })
        })
    })

})
