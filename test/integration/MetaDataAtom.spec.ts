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

import 'mocha'
import { expect } from 'chai'

import {
    RadixAccount,
    RadixAtomNodeStatus,
    RadixAtomNodeStatusUpdate,
    RadixIdentity,
    RadixIdentityManager,
    RadixNodeConnection,
    radixUniverse
} from '../../src'
import { bootstrapUniverseGetDevTokens } from './DataStorage.spec'
import RadixTransactionBuilder from '../../src/modules/txbuilder/RadixTransactionBuilder'
import { Observable } from 'rxjs'

describe('RLAU-572: MetaData in Atoms', () => {

    let aliceIdentity: RadixIdentity
    let alice: RadixAccount
    let bob: RadixAccount

    let nodeConnection: RadixNodeConnection

    before(async function() {
        aliceIdentity = await bootstrapUniverseGetDevTokens()
        alice = aliceIdentity.account
        bob = new RadixIdentityManager().generateSimpleIdentity().account
        nodeConnection = await radixUniverse.getNodeConnection()
    })
    
    function buildTestAtom(metaData: any): Observable<RadixAtomNodeStatusUpdate> {

        const atom = RadixTransactionBuilder.createRadixMessageAtom(
            alice,
            bob,
            'Hey',
        ).buildAtom()

        atom.metaData = metaData

        return RadixTransactionBuilder.signAndSubmitAtom(atom, nodeConnection, aliceIdentity).share()
    }


    it('1. should send a valid atom with some arbitrary metadata', function(done) {
        buildTestAtom({
            test1: 'some',
            test2: 'metaData',
        }).subscribe({
            next: (update) => {
                if (update.status === RadixAtomNodeStatus.STORED) {
                    done()
                }
            },
            error: (e) => {
                console.log(e)
                done('Should have succeded')
            },
        })
    })

    it('2. should send a valid atom with no metadata', function(done) {
        buildTestAtom({}).subscribe({
            error: (e) => {
                console.log(e)
                done('Should have succeded')
            },
            next: (update) => {
                if (update.status === RadixAtomNodeStatus.STORED) {
                    done()
                }
            },
        })
    })

    it('3. should fail with wrong type metadata', function(done) {
        // Set metadata as string instead of a map
        buildTestAtom('( ͡° ͜ʖ ͡°)').subscribe({
            error: (e) => {
                expect(e.data.message).to.contain(`Cannot deserialize`)
                done()
            },
            complete: () => { done(new Error(`Should have failed`)) },
        })
    })
})
