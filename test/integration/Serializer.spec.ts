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
    radixUniverse,
    RadixUniverse,
    RadixIdentityManager,
    RadixTransactionBuilder,
    RadixLogger,
    logger,
    RadixIdentity,
    radixTokenManager, RadixAddress
} from '../../src'
import { unencryptedPayloadMessageAction } from '../../src/modules/messaging/SendMessageAction'

const ERROR_MESSAGE = 'Local node needs to be running to run these tests'

describe('Serializer', () => {
    const identityManager = new RadixIdentityManager()
    let identity1: RadixIdentity
    let alice: RadixAddress

    before(async () => {
        RadixLogger.setLevel('error')

        const universeConfig = RadixUniverse.LOCAL_SINGLE_NODE
        await radixUniverse.bootstrapTrustedNode(universeConfig)

        try {
            await universeConfig.nodeDiscovery.loadNodes()
        } catch {
            logger.error(ERROR_MESSAGE)
            throw new Error(ERROR_MESSAGE)
        }

        identity1 = identityManager.generateSimpleIdentity()
        alice = identity1.address
    })

    it('should properly serialize and submit a payload above 16kb', done => {
        let payload = ''
        for (let i = 0; i < 20000; i++) {
            payload += 'X'
        }

        const bob = RadixAddress.generateNew()

        const txBuilder = new RadixTransactionBuilder().sendMessage(
            unencryptedPayloadMessageAction(
                alice,
                bob,
                Buffer.from(payload),
            ),
        )

        const dson = txBuilder.buildAtom().toDSON().toString('hex')

        expect(dson.substring(dson.length - 2)).to.equal('ff')
        
        txBuilder.signAndSubmit(identity1).subscribe({
            complete: () => done(),
            error: e => done(new Error(JSON.stringify(e))),
        })
    })
})
