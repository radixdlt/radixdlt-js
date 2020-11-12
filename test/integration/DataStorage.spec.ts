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
import { zip } from 'rxjs'
import { filter } from 'rxjs/operators'


import { RadixAccount, RadixIdentity, RadixIdentityManager, RadixMessageParticle, RadixTransactionBuilder } from '../../src'
import { RadixDecryptionState } from '../../src/modules/account/RadixDecryptionAccountSystem'
import { bootstrapLocalhostAndConnectToNode } from './RadixFaucetService.spec'


export const bootstrapUniverseGetDevTokens = async (): Promise<RadixIdentity> => {
    await bootstrapLocalhostAndConnectToNode()
    const alice = new RadixIdentityManager().generateSimpleIdentity()
    await alice.account.requestRadsForDevelopmentFromFaucetService()
    return alice
}

describe.only('MessageParticle', () => {

    let aliceIdentity: RadixIdentity
    let alice: RadixAccount
    let bob: RadixAccount

    before(async function() {
        aliceIdentity = await bootstrapUniverseGetDevTokens()
        alice = aliceIdentity.account
        bob = new RadixIdentityManager().generateSimpleIdentity().account
    })

    it('should submit unencrypted data to a node', function(done) {
        const appId = 'test_unencrypted'
        const plainText = 'Hey Bob, this is Alice'

        RadixTransactionBuilder.createPayloadAtom(
            alice,
            [bob],
            appId,
            plainText,
            false,
        )
            .signAndSubmit(aliceIdentity)
            .subscribe({
                complete: () => { done() },
                error: e => { done(new Error(`Failed to submit, error ${JSON.stringify(e, null, 4)}`)) },
            })
    })

        it('should submit encrypted data to a node', (done) => {
            const appId = 'test'
            const payload = Math.random().toString(36)

            RadixTransactionBuilder.createPayloadAtom(
                alice,
                [bob],
                appId,
                payload,
                true,
            )
                .signAndSubmit(aliceIdentity)
                .subscribe({
                    complete: () => {
                        done()
                    },
                    // next: state => console.log(state),
                    error: e => console.error(e),
                })
        })

        it(`should create an atom with a single ParticleGroup for encrypted messages`, function() {
            const appId = 'test'
            const payload = Math.random().toString(36)

            const atom = RadixTransactionBuilder.createPayloadAtom(
                alice,
                [alice],
                appId,
                payload,
                true,
            ).buildAtom()

            expect(atom.particleGroups.length).to.equal(1)
            expect(atom.getParticlesOfType(RadixMessageParticle).length).to.equal(2)
        })

        it('should send encrypted data to self', (done) => {
            const appId = 'test'
            const payload = Math.random().toString(36)

            RadixTransactionBuilder.createPayloadAtom(
                alice,
                [alice],
                appId,
                payload,
                true,
            )
                .signAndSubmit(aliceIdentity)
                .subscribe({
                    complete: () => {
                        alice.dataSystem.getApplicationData(appId).subscribe(update => {
                            if (update.data.payload.data === payload) {
                                done()
                            }
                        })
                    },
                    // next: state => console.log(state),
                    error: e => console.error(e),
                })
        })

        it('should send unencrypted data to self', (done) => {
            const appId = 'test'
            const payload = Math.random().toString(36)

            RadixTransactionBuilder.createPayloadAtom(
                alice,
                [alice],
                appId,
                payload,
                false,
            )
                .signAndSubmit(aliceIdentity)
                .subscribe({
                    complete: () => {
                        alice.dataSystem.getApplicationData(appId).subscribe(update => {
                            if (update.data.payload.data === payload) {
                                done()
                            }
                        })
                    },
                    // next: state => console.log(state),
                    error: e => console.error(e),
                })
        })

        it('should send encrypted data to another account', (done) => {
            const appId = 'test_3'
            const payload = Math.random().toString(36)

            RadixTransactionBuilder.createPayloadAtom(
                alice,
                [alice, bob],
                appId,
                payload,
                true,
            )
                .signAndSubmit(aliceIdentity)
                .subscribe({
                    complete: () => {
                        // Look for the data in both accounts
                        const acc1stream = alice.dataSystem.getApplicationData(appId).pipe(
                            filter(update => update.data.payload.data === payload),
                        )
                        const acc2stream = bob.dataSystem.getApplicationData(appId).pipe(
                            filter(update => update.data.payload.data === payload),
                        )

                        // Finish only when data has been found in both accounts
                        zip(acc1stream, acc2stream).subscribe(val => {
                            done()
                        })
                    },
                    // next: state => console.log(state),
                    error: e => console.error(e),
                })
        })

        it('should send unencrypted data to another account', (done) => {
            const appId = 'test_3'
            const payload = Math.random().toString(36)

            RadixTransactionBuilder.createPayloadAtom(
                alice,
                [alice, bob],
                appId,
                payload,
                false,
            )
                .signAndSubmit(aliceIdentity)
                .subscribe({
                    complete: () => {
                        // Look for the data in both accounts
                        const acc1stream = alice.dataSystem.getApplicationData(appId).pipe(
                            filter(update => update.data.payload.data === payload),
                        )
                        const acc2stream = bob.dataSystem.getApplicationData(appId).pipe(
                            filter(update => update.data.payload.data === payload),
                        )

                        // Finish only when data has been found in both accounts
                        zip(acc1stream, acc2stream).subscribe(val => {
                            done()
                        })
                    },
                    // next: state => console.log(state),
                    error: e => console.error(e),
                })
        })

        it('should deal with undecryptable data', (done) => {
            const appId = 'test_4'
            const payload = Math.random().toString(36)

            // Create a broken encrypted message
            new RadixTransactionBuilder()
                .addMessageParticle(
                alice,
                payload,
                {
                    application: appId,
                },
                [alice, bob],
            )
                .addMessageParticle(alice,
                JSON.stringify([]),
                {
                    application: 'encryptor',
                    contentType: 'application/json',
                },
                [alice, bob])
                .signAndSubmit(aliceIdentity)
                .subscribe({
                    complete: () => {
                        bob.dataSystem.getApplicationData(appId).subscribe(update => {
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
