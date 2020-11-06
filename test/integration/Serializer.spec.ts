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

import { RadixAddress } from '../../src'
import RadixApplicationClient from '../../src/modules/radix-application-client/RadixApplicationClient'
import { generateNewPublicKey } from './RadixMessagingAccountSystem.spec'

describe('Serializer', () => {

    let aliceAPIClient: RadixApplicationClient
    let bob: RadixAddress

    before(async () => {
        aliceAPIClient = await RadixApplicationClient.createByBootstrapingTrustedNode()
        bob = aliceAPIClient.addressWithPublicKey(generateNewPublicKey())
    })


    it('should properly serialize and submit a payload above 16kb', done => {
        let payload = ''
        for (let i = 0; i < 20000; i++) {
            payload += 'X'
        }


        aliceAPIClient.submitPlainTextMessage(
            bob,
            payload,
        ).subscribe({

                next: (atomObservation) => {
                    const atom = atomObservation.atom
                    const dson = atom.toDSON().toString('hex')
                    expect(dson.substring(dson.length - 2)).to.equal('ff')
                },

                error: e => done(new Error(JSON.stringify(e))),

                complete: () => done(),
            },
        )


    })
})
