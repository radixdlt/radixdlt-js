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
import { describe, beforeEach, before } from 'mocha'

import RadixServer from './server/RadixServer'

import {
    radixUniverse,
    RadixUniverse,
    RadixAddress,
    RadixMessage,
    RadixRemoteIdentity,
    RadixSimpleIdentity,
    RadixTransactionBuilder,
    RadixAccount,
    RadixLogger,
    RadixAtomNodeStatus,
} from '../../src/index'
import { unencryptedTextMessageAction } from '../../src/modules/messaging/SendMessageAction'




describe('RadixRemoteIdentity', () => {

    let server
    let identity
    let otherIdentity
    let account
    let otherAccount
    let permissionlessIdentity
    let permissionlessAccount
    let alice
    let bob

    before(async () => {
        RadixLogger.setLevel('error')
    
        // Bootstrap the universe
        await radixUniverse.bootstrapTrustedNode(RadixUniverse.LOCAL_SINGLE_NODE)
    
        server = new RadixServer()
        server.start()
    
        const permissions = ['get_public_key', 'decrypt_ecies_payload']
    
        identity = await RadixRemoteIdentity.createNew('dapp', 'dapp description', undefined, 'localhost', '54346')
        otherIdentity = new RadixSimpleIdentity(RadixAddress.generateNew())
        permissionlessIdentity = await RadixRemoteIdentity.createNew('dapp', 'dapp description', permissions, 'localhost', '54346')
    
        // Get accounts
        account = identity.account
        alice = account.address
        otherAccount = otherIdentity.account
        bob = otherAccount.address
        permissionlessAccount = permissionlessIdentity.account

        // Wait for the account & permisionlessAccount to sync data from the ledger
    })


    it('should return false if the Desktop wallet is closed', function (done) {
        this.timeout(4000)

        // Try a port different from 54346 that's where our server is running
        RadixRemoteIdentity.isServerUp('localhost', '2525')
        .then((value) => {
            expect(value).to.eql(false)
            done()
        })
        .catch((error) => {
            done(error)
        })
    })

    it('should return true if the Desktop wallet is open', function (done) {
        this.timeout(4000)

        RadixRemoteIdentity.isServerUp('localhost', '54346')
        .then((value) => {
            expect(value).to.eql(true)
            done()
        })
        .catch((error) => {
            done(error)
        })
    })

    it('should create a new RadixRemoteIdentity with the same address that appears in the wallet when the user approves permissions', function (done) {
        this.timeout(4000)

        const remoteIdentityAddress = RadixAddress.fromPublic(identity.getPublicKey()).getAddress()
        RadixRemoteIdentity.getRemotePublicKey(identity.token, 'localhost', '54346')
        .then((walletPublicKey) => {
            const walletAddress = RadixAddress.fromPublic(walletPublicKey).getAddress()
            expect(remoteIdentityAddress).to.eql(walletAddress)
            done()
        })
        .catch((error) => {
            done(error)
        })
    })

    it('should sign and send an atom', function (done) {
        this.timeout(20000)

        // Send a dummy message
        const transactionStatus = new RadixTransactionBuilder()
            .sendMessage(
                unencryptedTextMessageAction(
                    alice,
                    bob,
                    'Foobar',
                ),
            )
        .signAndSubmit(identity)

        transactionStatus.subscribe({
            next: status => {
                if (status.status === RadixAtomNodeStatus.STORED_FINAL) {
                    done()
                }
            },
            error: error => {
                done(error)
            },
        })
    })

    it('should fail when signing an atom without the "sign_atom" permission', function (done) {
        this.timeout(20000)

        // Send a dummy message
        const transactionStatus = new RadixTransactionBuilder()
            .sendMessage(
                unencryptedTextMessageAction(
                    alice,
                    bob,
                    'Foobar',
                ),
            )
        .signAndSubmit(permissionlessIdentity)

        transactionStatus.subscribe({
        next: status => {
            // For a valid transaction, this will print, 'FINDING_NODE', 'GENERATING_POW', 'SIGNING', 'STORE', 'STORED'
            if (status.status === RadixAtomNodeStatus.STORED_FINAL) {
            done(`This message shouldn\'t be sent successfully`)
            }
        },
            error: error => {
                expect(error).to.deep.include({
                    message: 'Internal error',
                    code: -32603,
                    data: "Permission 'sign_atom' not granted", 
                })
                done()
            },
        })
    })

    it('should decrypt an encrypted message', function (done) {
        this.timeout(20000)

        const messages = account.messagingSystem.messages.values()
        const lastMessage = Array.from(messages)[messages.length - 1] as RadixMessage

        expect(lastMessage.content).is.eql('Foobar')

        done()
    })
})
