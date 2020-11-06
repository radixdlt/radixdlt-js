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
//
//
// import {
//     logger,
//     RadixAddress,
//     RadixIdentityManager,
//     RadixNodeConnection,
//     RadixTransactionBuilder,
//     RadixUniverse,
//     radixUniverse,
//     RRI,
// } from '../../src'
//
// import { RadixTokenDefinition } from '../../src/modules/token/RadixTokenDefinition'
// import Decimal from 'decimal.js'
// import RadixSimpleIdentity from '../../src/modules/identity/RadixSimpleIdentity'
// import RadixAccount from '../../src/modules/account/RadixAccount'
// import RadixApplicationClient from '../../src/modules/radix-application-client/RadixApplicationClient'
//
// describe.skip('RLAU-1005: Handle atom DELETE events', function() {
//     const identityManager = RadixIdentityManager.byCreatingNewIdentity()
//
//     const TEST_TOKEN_SYMBOL = 'CONF'
//
//     let identity1: RadixSimpleIdentity
//     let identity2: RadixSimpleIdentity
//     let alice: RadixAddress
//     let aliceAccount: RadixAccount
//     let bob: RadixAddress
//     let bobAccount: RadixAccount
//     let transactionBuilder: RadixTransactionBuilder
//     let applicationClient: RadixApplicationClient
//     let aliceToken: RRI
//     let node1: RadixNodeConnection
//     let node2: RadixNodeConnection
//
//     before(async () => {
//         logger.setLevel('error')
//         const universeConfig = RadixUniverse.LOCAL_SINGLE_NODE
//         await radixUniverse.bootstrapTrustedNode(universeConfig)
//         // Check node is available
//         try {
//             await universeConfig.nodeDiscovery.loadNodes()
//         } catch {
//             const message = 'Local node needs to be running to run these tests'
//             logger.error(message)
//             throw new Error(message)
//         }
//     })
//
//
//     beforeEach(async () => {
//         // Create test identities
//         identity1 = identityManager.generateSimpleIdentity()
//         identity2 = identityManager.generateSimpleIdentity()
//         const magicByte = radixUniverse.getMagicByte()
//         alice = new RadixAddress(magicByte, identity1.getPublicKey())
//         aliceAccount = new RadixAccount(alice)
//         transactionBuilder = new RadixTransactionBuilder(aliceAccount)
//         applicationClient = new RadixApplicationClient(aliceAccount)
//
//         bob = new RadixAddress(magicByte, identity2.getPublicKey())
//         bobAccount = new RadixAccount(bob)
//
//         aliceToken = new RRI(alice, TEST_TOKEN_SYMBOL)
//
//         // Create test token
//         await transactionBuilder.createTokenMultiIssuance(
//             'Test Tokens',
//             TEST_TOKEN_SYMBOL,
//             'description',
//             new Decimal('1e-18'),
//             4000,
//             'http://image.com',
//             'http://a.b.com',
//         )
//         .signAndSubmit(identity1)
//         .toPromise()
//
//
//         // Find 2 nodes for conflicing submissions
//         const nodes = radixUniverse.getLiveNodes().filter(node => {
//             return node
//         })
//
//         if (nodes.length >= 2) {
//             logger.info('Using two nodes')
//             node1 = new RadixNodeConnection(nodes[0])
//             node2 = new RadixNodeConnection(nodes[1])
//             await Promise.all([node1.openConnection(), node2.openConnection()])
//         } else {
//             throw new Error('Couldn\'t find a node to test against')
//         }
//     })
//
//
//     afterEach(async () => {
//         node1.close()
//         node2.close()
//     })
//
//     it('should submit two conflicting transfers and expect one of them to fail', function(done) {
//         this.timeout(20000)
//
//         // Construct 2 conflicting atoms
//         const atom1 = transactionBuilder.addTransfer(
//             bob,
//             aliceToken,
//             1000,
//         ).buildAtom()
//
//         const atom2 = transactionBuilder.addTransfer(
//             bob,
//             aliceToken,
//             1000,
//         ).buildAtom()
//
//         const subscription = applicationClient.observeMyBalance(aliceToken)
//         .subscribe(balance => {
//             logger.debug(`Balance: ${balance}`)
//         })
//
//         // Submit both
//         RadixTransactionBuilder.signAndSubmitAtom(atom1, node1, identity1)
//             .subscribe({
//                 next: (update) => {logger.debug(update)},
//                 error: error => logger.debug(error),
//             })
//         RadixTransactionBuilder.signAndSubmitAtom(atom2, node2, identity1)
//             .subscribe({
//                 next: (update) => {logger.debug(update)},
//                 error: error => logger.debug(error),
//             })
//
//         setTimeout(() => {
//             expect(aliceAccount.transferSystem.transactions.length).to.eq(2)
//             expect(aliceAccount.transferSystem.tokenUnitsBalance[aliceToken.toString()].toString())
//                 .to.eq('3000')
//
//             expect(bobAccount.transferSystem.transactions.length).to.eq(1)
//             expect(bobAccount.transferSystem.tokenUnitsBalance[aliceToken.toString()].toString())
//                 .to.eq('1000')
//
//             subscription.unsubscribe()
//
//             done()
//         }, 10000)
//     })
//
//
//     it('should submit two conflicting burns and expect one of them to fail', function(done) {
//         this.timeout(20000)
//
//         // Construct 2 conflicting atoms
//         const atom1 = transactionBuilder.burnTokens(
//             aliceToken,
//             1000,
//         )
//         .buildAtom()
//
//         const atom2 = transactionBuilder.burnTokens(
//             aliceToken,
//             1000,
//         )
//             .buildAtom()
//
//
//         aliceAccount.tokenDefinitionSystem.getTokenDefinitionObservable(TEST_TOKEN_SYMBOL).map(token => {
//             return RadixTokenDefinition.fromSubunitsToDecimal(token.totalSupply).toString()
//         })
//         .subscribe(totalSupply => {
//             logger.debug(`Supply: ${totalSupply}`)
//         })
//
//         // Submit both
//         RadixTransactionBuilder.signAndSubmitAtom(atom1, node1, identity1)
//         .subscribe({
//             error: error => logger.debug(error),
//         })
//         RadixTransactionBuilder.signAndSubmitAtom(atom2, node2, identity1)
//         .subscribe({
//             error: error => logger.debug(error),
//         })
//
//         setTimeout(() => {
//             const supply = RadixTokenDefinition.fromSubunitsToDecimal(
//                 aliceAccount.tokenDefinitionSystem.getTokenDefinition(TEST_TOKEN_SYMBOL).totalSupply,
//             ).toString()
//
//             expect(supply).to.eq('3000')
//
//             done()
//         }, 10000)
//     })
//
//
//
// })
