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
import RadixIdentity from '../identity/RadixIdentity'
import RadixUniverse, { radixUniverse } from '../universe/RadixUniverse'
import RadixIdentityManager from '../identity/RadixIdentityManager'
import { RadixAddress, RadixTransactionBuilder } from '../../index'
import {
    encryptedPayloadMessageAction,
    encryptedTextDecryptableBySenderAndRecipientMessageAction, encryptedTextMessageAction,
    unencryptedPayloadMessageAction, unencryptedTextMessageAction
} from './SendMessageAction'
import { zip } from 'rxjs'
import { filter } from 'rxjs/operators'
import { decryptableOnlyBySpecifiedRecipients } from './encryption-mode/encryption-mode-encrypt/encrypt-context/encrypt-context-should-encrypt/EncryptContextShouldEncryptBuilder'



describe('Messaging', () => {

    const identityManager = new RadixIdentityManager()

    let identity1: RadixIdentity
    let identity2: RadixIdentity
    let alice: RadixAddress
    let bob: RadixAddress

    before(async () => {
        // logger.setLevel('error')

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

        identity1 = identityManager.generateSimpleIdentity()
        identity2 = identityManager.generateSimpleIdentity()
        alice = identity1.address
        bob = identity2.address
    })

    after(async () => {
        // This take a long time
        // radixUniverse.closeAllConnections()
        // Soo just kill it
        // process.exit(0)
    })

    it('should submit encrypted data to a node', (done) => {

        new RadixTransactionBuilder().sendMessage(
            encryptedTextDecryptableBySenderAndRecipientMessageAction(
                alice,
                bob,
                'Hey this is a secret',
            ),
        )
            .signAndSubmit(identity1)
            .subscribe({
                complete: () => {
                    done()
                },
                // next: state => console.log(state),
                error: e => console.error(e),
            })
    })


    it('should submit unencrypted data to a node', (done) => {

        new RadixTransactionBuilder().sendMessage(
            unencryptedTextMessageAction(
                alice,
                bob,
                'Hello Bob (and world)',
            ),
        )
            .signAndSubmit(identity1)
            .subscribe({
                complete: () => {
                    done()
                },
                // next: state => console.log(state),
                error: e => console.error(e),
            })
    })


    it('should deal with undecryptable data', (done) => {

        // Create a broken encrypted message
        new RadixTransactionBuilder()
            .sendMessage(
                encryptedTextMessageAction(
                    alice,
                    bob,
                    'secret that noone can decryp',
                    decryptableOnlyBySpecifiedRecipients([]),
                ),
            )
            .signAndSubmit(identity1)
            .subscribe({
                complete: () => {
                    identity2.account.dataSystem.getApplicationData(appId).subscribe(update => {
                        if (update.data.payload.data === payload) {
                            if (update.data.payload.decryptionState === RadixDecryptionState.CANNOT_DECRYPT) {
                                done()
                            } else {
                                done('Wrong decryption state: ' + update.data.payload.decryptionState)
                            }
                        }
                    })
                },
                // next: state => console.log(state),
                error: e => console.error(e),
            })
    })
})
