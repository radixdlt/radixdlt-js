// /*
//  * (C) Copyright 2020 Radix DLT Ltd
//  *
//  * Permission is hereby granted, free of charge, to any person obtaining a
//  * copy of this software and associated documentation files (the “Software”),
//  * to deal in the Software without restriction, including without limitation
//  * the rights to use, copy, modify, merge, publish, distribute, sublicense,
//  * and/or sell copies of the Software, and to permit persons to whom the
//  * Software is furnished to do so, subject to the following conditions:
//  *
//  * The above copyright notice and this permission notice shall be
//  * included in all copies or substantial portions of the Software.
//  *
//  * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS
//  * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//  * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
//  * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//  * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
//  * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
//  * DEALINGS IN THE SOFTWARE.
//  */
//
// import 'mocha'
// import { expect } from 'chai'
// import { doesNotReject } from 'assert'
// import { identity, zip } from 'rxjs'
// import { filter } from 'rxjs/operators'
//
// import Decimal from 'decimal.js'
// import BN from 'bn.js'
// import axios from 'axios'
//
// import {
//     logger,
//     RadixUniverse,
//     RadixIdentityManager,
//     RadixTransactionBuilder,
//     RadixAccount,
//     RadixLogger,
//     RadixTokenDefinition,
//     RadixIdentity, RadixAddress
// } from '../../src'
// import { token } from '../../src/modules/hardware-wallet/test/setup'
// import RadixSimpleIdentity from '../../src/modules/identity/RadixSimpleIdentity'
// import RadixApplicationClient from '../../src/modules/radix-application-client/RadixApplicationClient'
//
//
// const ERROR_MESSAGE = 'Local node needs to be running to run these tests'
//
// describe('Multi Issuance Token Class', () => {
//     const identityManager = RadixIdentityManager.byCreatingNewIdentity()
//     let RLAU_URI: string
//     let RLAU2_URI: string
//
//     let identity1: RadixSimpleIdentity
//     let identity2: RadixSimpleIdentity
//     let alice: RadixAddress
//     let aliceAccount: RadixAccount
//     let bob: RadixAddress
//     let bobAccount: RadixAccount
//     let transactionBuilder: RadixTransactionBuilder
//     let applicationClient: RadixApplicationClient
//
//     before(async () => {
//         logger.setLevel('error')
//
//         const universeConfig = RadixUniverse.LOCAL_SINGLE_NODE
//         await radixUniverse.bootstrapTrustedNode(universeConfig)
//
//         // Check node is available
//         try {
//             await universeConfig.nodeDiscovery.loadNodes()
//         } catch (e) {
//             console.error(e)
//             const message = 'Local node needs to be running to run these tests'
//             console.error(message)
//             throw new Error(message)
//         }
//
//         const magicByte = radixUniverse.getMagicByte()
//         identity1 = identityManager.generateSimpleIdentity()
//         identity2 = identityManager.generateSimpleIdentity()
//         alice = new RadixAddress(magicByte, identity1.getPublicKey())
//         aliceAccount = new RadixAccount(alice)
//         transactionBuilder = new RadixTransactionBuilder(aliceAccount)
//         applicationClient = new RadixApplicationClient(aliceAccount)
//
//         bob = new RadixAddress(magicByte, identity2.getPublicKey())
//         bobAccount = new RadixAccount(bob)
//
//         RLAU_URI = `/${alice}/RLAU`
//         RLAU2_URI = `/${alice}/RLAU2`
//     })
//
//     after(async () => {
//         //
//     })
//
//     it('should create a multi issuance token with symbol RLAU', function (done) {
//         this.timeout(50000)
//
//         const symbol = 'RLAU'
//         const name = 'RLAU test'
//         const description = 'my token description'
//         const granularity = new Decimal('1e-18')
//         const amount = 1000
//         const tokenUrl = 'http://a.b.com'
//         const iconUrl = 'http://image.com'
//
//         transactionBuilder.createTokenMultiIssuance(
//             name,
//             symbol,
//             description,
//             granularity,
//             amount,
//             iconUrl,
//             tokenUrl,
//         )
//         .signAndSubmit(identity1)
//         .subscribe({
//             complete: () => {
//                 // Check balance
//                 expect(aliceAccount.transferSystem.tokenUnitsBalance[RLAU_URI].eq(amount)).to.be.true
//                 done()
//             },
//             error: e => done(new Error(JSON.stringify(e))),
//         })
//     })
//
//     it('should fail when creating a conflicting token with repeated symbol RLAU', function (done) {
//         this.timeout(50000)
//
//         const symbol = 'RLAU'
//         const name = 'RLAU test'
//         const description = 'my token description'
//         const granularity = new Decimal('1e-18')
//         const amount = 100000000
//         const tokenUrl = 'http://a.b.com'
//         const iconUrl = 'http://image.com'
//
//         transactionBuilder.createTokenMultiIssuance(
//             name,
//             symbol,
//             description,
//             granularity,
//             amount,
//             iconUrl,
//             tokenUrl,
//         )
//         .signAndSubmit(identity1)
//         .subscribe({
//             complete: () => done(new Error("This token shouldn't be created")),
//             error: () => {
//                 done()
//             },
//         })
//     })
//
//     it('should fail when creating a token with granularity 0', function() {
//         this.timeout(50000)
//
//         const symbol = 'RLAU0'
//         const name = 'RLAU0 test'
//         const description = 'my token description'
//         const granularity = 0
//         const amount = 100000000
//         const tokenUrl = 'http://a.b.com'
//         const iconUrl = 'http://image.com'
//
//         expect(() => {
//             transactionBuilder.createTokenMultiIssuance(
//                 name,
//                 symbol,
//                 description,
//                 granularity,
//                 amount,
//                 iconUrl,
//                 tokenUrl,
//             )
//         }).to.throw()
//     })
//
//
//     it('should fail when creating a token with granularity < 1e-18', function() {
//         this.timeout(50000)
//
//         const symbol = 'RLAU0'
//         const name = 'RLAU0 test'
//         const description = 'my token description'
//         const granularity = new Decimal('1e-19')
//         const amount = 100000000
//         const tokenUrl = 'http://a.b.com'
//         const iconUrl = 'http://image.com'
//
//         expect(() => {
//             transactionBuilder.createTokenMultiIssuance(
//                 name,
//                 symbol,
//                 description,
//                 granularity,
//                 amount,
//                 iconUrl,
//                 tokenUrl,
//             )
//         }).to.throw()
//     })
//
//     it('should fail when creating a token with supply not multiple of granularity', function() {
//         this.timeout(50000)
//
//         const symbol = 'RLAU0'
//         const name = 'RLAU0 test'
//         const description = 'my token description'
//         const granularity = 1
//         const amount = 1.5
//         const tokenUrl = 'http://a.b.com'
//         const iconUrl = 'http://image.com'
//
//         expect(() => {
//             transactionBuilder.createTokenMultiIssuance(
//                 name,
//                 symbol,
//                 description,
//                 granularity,
//                 amount,
//                 iconUrl,
//                 tokenUrl,
//             )
//         }).to.throw()
//     })
//
//     it('should create a multi issuance token with symbol RLAU2 and granularity 2', function (done) {
//         this.timeout(50000)
//
//         const symbol = 'RLAU2'
//         const name = 'RLAU2 test'
//         const description = 'my token description'
//         const granularity = 2
//         const amount = 20000000
//         const tokenUrl = 'http://a.b.com'
//         const iconUrl = 'http://image.com'
//
//         transactionBuilder.createTokenMultiIssuance(
//             name,
//             symbol,
//             description,
//             granularity,
//             amount,
//             iconUrl,
//             tokenUrl,
//         )
//         .signAndSubmit(identity1)
//         .subscribe({
//             complete: () => done(),
//             error: e => done(new Error(JSON.stringify(e))),
//         })
//     })
//
//     it('should succeed transacting within granularity', function(done) {
//         this.timeout(50000)
//
//         try {
//             transactionBuilder.addTransfer(
//                 bob,
//                 RLAU2_URI,
//                 new Decimal(100),
//                 'test',
//             )
//                 .signAndSubmit(identity1)
//                 .subscribe({
//                 complete: () => {
//                     bobAccount.transferSystem.getAllTransactions().subscribe((txUpdate) => {
//                         if (txUpdate.transaction.message === 'test') {
//                             done()
//                         }
//                     })
//                 },
//                 error: e =>  done(new Error('This transaction should have been accepted')),
//                 })
//         } catch (error) {
//             done()
//         }
//     })
//
//     it('should fail when transacting with the wrong granularity', function(done) {
//         this.timeout(50000)
//
//         try {
//             transactionBuilder.addTransfer(
//                 bob,
//                 RLAU2_URI,
//                 new Decimal(1),
//             )
//                 .signAndSubmit(identity1)
//                 .subscribe({
//                     complete: () => done(new Error('This transaction should have been rejected')),
//                     error: e => done(),
//             })
//         } catch (error) {
//             done()
//         }
//     })
//
//     it('should fail creating token with invalid icon url', function(done) {
//         this.timeout(50000)
//
//         const symbol = 'RLAU0'
//         const name = 'RLAU0 test'
//         const description = 'my token description'
//         const granularity = 1
//         const amount = 100000000
//         const iconUrl = 'asdfg'
//
//         transactionBuilder.createTokenMultiIssuance(
//             name,
//             symbol,
//             description,
//             granularity,
//             amount,
//             iconUrl,
//             'https://example.token.com',
//         )
//         .signAndSubmit(identity1)
//         .subscribe({
//             complete: () => done(new Error("This token shouldn't be created")),
//             error: () => done(),
//         })
//     })
//
//
//
//     it('should fail minting with the wrong identity', function(done) {
//         this.timeout(50000)
//
//         transactionBuilder.mintTokens(
//             RLAU_URI,
//             100,
//         ).signAndSubmit(identity2)
//         .subscribe({
//             complete: () => { done('Should have failed') },
//             error: e => done(),
//         })
//     })
//
// })
