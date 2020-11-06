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
import { logger, RadixAddress, RadixAtomNodeStatus } from '../..'
import { RadixAtom } from '../atommodel/atom/RadixAtom'
import { RadixNEDBAtomStore } from './RadixNEDBAtomStore'
import { unencryptedPayloadMessageAction } from '../messaging/SendMessageAction'
import { generateNewAddressWithMagic } from '../atommodel/primitives/RadixAddress.spec'
import { sendMessageActionToParticleGroup } from '../messaging/SendMessageActionToParticleGroupsMapper'
import { fail } from 'assert';

describe('RadixNEDBAtomStore', () => {

    let alice: RadixAddress
    let atomStore: RadixNEDBAtomStore
    let atom1: RadixAtom
    let atom2: RadixAtom


    beforeEach(() => {
        logger.error(`Before!`)
        const magicByte = 0xFF
        alice = generateNewAddressWithMagic(magicByte)
        const bob = generateNewAddressWithMagic(magicByte)

        const makeAtomWithMessage = (message: string): RadixAtom => {
            return new RadixAtom([
                sendMessageActionToParticleGroup(
                    unencryptedPayloadMessageAction(
                        alice, bob, Buffer.from(message, 'utf8'),
                    ),
                ),
            ])
        }

        atomStore = new RadixNEDBAtomStore({inMemoryOnly: true})
        atom1 = makeAtomWithMessage('Note to self: my name is Alice - in case I would forget')
        atom2 = makeAtomWithMessage('Hey Bob, this is Alice!')
    })

    it('should not insert twice', async () => {
        atomStore.insert(atom1, {status: RadixAtomNodeStatus.STORED}).then((inserted) => {
            expect(inserted).to.be.true

            return atomStore.insert(atom1, {status: RadixAtomNodeStatus.STORED})
        }).then((inserted) => {
            expect(inserted).to.be.false
        })
    })

    it('should query all atoms', (done) => {
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
                    },
                    error: (error) => {
                        fail(`Got unexpected error: ${error}`)
                        done()
                    },
                })
        })
    })

    it('should query atoms by addresses', (done) => {
        atomStore.insert(atom1, {status: RadixAtomNodeStatus.STORED})
            .then((inserted) => {
                expect(inserted).to.be.true
                return atomStore.insert(atom2, {status: RadixAtomNodeStatus.STORED})
            }).then((inserted) => {
                expect(inserted).to.be.true

                const aliceAtoms = []

                atomStore.getStoredAtomObservations(alice).subscribe({
                    next: (atom) => {
                        aliceAtoms.push(atom)
                    },
                    complete: () => {
                        expect(aliceAtoms).to.be.of.length(2)
                        done()
                    },
                })
        })
    })

})
