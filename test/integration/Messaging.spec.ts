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

import { v4 as uuidv4 } from 'uuid'

import { logger, RadixAccount, RadixIdentity, RadixIdentityManager, RadixMessageParticle, RadixTransactionBuilder } from '../../src'
import { RadixDecryptionState } from '../../src/modules/account/RadixDecryptionAccountSystem'
import { bootstrapLocalhostAndConnectToNode } from './RadixFaucetService.spec'


export const bootstrapUniverseGetDevTokens = async (): Promise<RadixIdentity> => {
    await bootstrapLocalhostAndConnectToNode()
    const alice = new RadixIdentityManager().generateSimpleIdentity()
    await alice.account.requestRadsForDevelopmentFromFaucetService()
    return alice
}

describe('Messaging', function() {

    let aliceIdentity: RadixIdentity
    let alice: RadixAccount
    let bob: RadixAccount

    before(async function() {
        aliceIdentity = await bootstrapUniverseGetDevTokens()
        alice = aliceIdentity.account
        bob = new RadixIdentityManager().generateSimpleIdentity().account
    })

    it('should submit unencrypted data to a node', function(done) {
        const appId = uuidv4()
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
                complete: () => done(),
                error: e => { done(new Error(`Failed to submit, error ${JSON.stringify(e, null, 4)}`)) },
            })
    })

    it('should submit encrypted data to a node', function(done) {
        const appId = uuidv4()
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
                error: e => done(e),
            })
    })

    it(`should create an atom with a single ParticleGroup for encrypted messages`, function() {
        const appId = uuidv4()
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

    const sendMessageToSelf = async (encrypted: boolean): Promise<any> => {
        const appId = uuidv4()
        const payload = 'Hey Alice, this is you, yourself!'

        return RadixTransactionBuilder.createPayloadAtom(
            alice,
            [alice, bob],
            appId,
            payload,
            encrypted,
        )
            .signAndSubmit(aliceIdentity)
            .take(1)
            .flatMap(_ => {
                return alice.dataSystem.getApplicationData(appId).take(1)
            })
            .map(_ => null)
            .toPromise()
    }

    it('should send encrypted data to self', async function() {
        await sendMessageToSelf(true)
    })

    it('should send unencrypted data to self', async function() {
        await sendMessageToSelf(false)
    })

    const sendMessagesAssertItsReceivedByRecipientAndSender = async (encrypted: boolean): Promise<any> => {
        const appId = uuidv4()
        const payload = 'Hey Bob, this is Alice!'

        return RadixTransactionBuilder.createPayloadAtom(
            alice,
            [alice, bob],
            appId,
            payload,
            encrypted,
        )
            .signAndSubmit(aliceIdentity)
            .take(1)
            .flatMap(_ => {
                // Look for the data in both accounts
                const acc1stream = alice.dataSystem.getApplicationData(appId).take(1)
                const acc2stream = bob.dataSystem.getApplicationData(appId).take(1)
                // Finish only when data has been found in both accounts
                return zip(acc1stream, acc2stream)
            })
            .map(_ => null)
            .toPromise()
    }

    it('should send encrypted data to another account', async function() {
        await sendMessagesAssertItsReceivedByRecipientAndSender(true)
    })

    it('should send unencrypted data to another account', async function() {
        await sendMessagesAssertItsReceivedByRecipientAndSender(false)
    })

    it('should deal with undecryptable data', async function() {
        const appId = uuidv4()
        const payload = 'Hey Bob, this is Alice, but sadly you cannot read this'

        // Create a broken encrypted message
        const decryptionStatePromise = new RadixTransactionBuilder()
            .addMessageParticle(
                alice,
                payload,
                {
                    application: appId,
                },
                [alice, bob],
            )
            .addMessageParticle(
                alice,
                JSON.stringify([]), // <--- look, no decryptors!
                {
                    application: 'encryptor',
                    contentType: 'application/json',
                },
                [alice, bob],
            )
            .signAndSubmit(aliceIdentity)
            .take(1)
            .flatMap(_ => {
                return bob.dataSystem.getApplicationData(appId).delay(1000).take(1)
            })
            .map(update => {
                    if (update.data.payload.data === payload) {
                        return update
                    } else {
                        throw new Error(`ERROR wrong payload.`)
                    }
                },
            )
            .map(u => u.data.payload.decryptionState)
            .toPromise()


        const decryptionState = await decryptionStatePromise

        expect(decryptionState).to.equal(RadixDecryptionState.CANNOT_DECRYPT)
    })

})
