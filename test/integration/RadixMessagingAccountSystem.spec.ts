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
import RadixUniverse, { radixUniverse } from '../../src/modules/universe/RadixUniverse'
import { RadixAddress } from '../../src'
import RadixApplicationClient from '../../src/modules/radix-application-client/RadixApplicationClient'
import PrivateKey from '../../src/modules/crypto/PrivateKey'

export const newApplicationClient = (magicByte: number): RadixApplicationClient => {
    const privateKey = PrivateKey.generateNew()
    return RadixApplicationClient.withMagic(magicByte, privateKey)
}

describe('Messaging', () => {

    let aliceAPIClient: RadixApplicationClient
    let bob: RadixAddress

    before(async () => {
        const universeConfig = RadixUniverse.LOCAL_SINGLE_NODE
        await radixUniverse.bootstrapTrustedNode(universeConfig)

        // Check node is available
        try {
            await universeConfig.nodeDiscovery.loadNodes()
        } catch (e) {
            console.error(e)
            const message = 'Local node needs to be running to run these tests'
            console.error(message)
            throw new Error(message)
        }

        const magic = radixUniverse.getMagicByte()
        aliceAPIClient = newApplicationClient(magic)
        bob = new RadixAddress(magic, PrivateKey.generateNew().publicKey())
    })

    it('should submit encrypted data to a node', (done) => {

        aliceAPIClient.submitEncryptedTextMessageReadableBySenderAndRecipient(
            bob,
            'Hey this is a secret',
        ).subscribe({
            complete: () => {
                done()
            },
            // next: state => console.log(state),
            error: e => console.error(e),
        })
    })


    it('should submit unencrypted data to a node', (done) => {

        aliceAPIClient.submitPlainTextMessage(
            bob,
            'Hello Bob (and world)',
        ).subscribe({
            complete: () => {
                done()
            },
            // next: state => console.log(state),
            error: e => console.error(e),
        })
    })
})
