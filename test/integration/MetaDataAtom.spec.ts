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
// import WebSocket from 'ws'
//
// import {
//     RadixAddress,
//     RadixAtom,
//     RadixAtomNodeStatus,
//     RadixFeeProvider,
//     RadixIdentity,
//     RadixIdentityManager,
//     RadixLogger,
//     RadixMessageParticle,
//     RadixNodeConnection,
//     RadixParticleGroup,
//     RadixSerializer,
//     RadixSpunParticle, RadixTransactionBuilder,
//     radixUniverse,
//     RadixUniverse, RRI
// } from '../../src'
// import RadixAccount from '../../src/modules/account/RadixAccount'
// import RadixApplicationClient from '../../src/modules/radix-application-client/RadixApplicationClient'
// import RadixSimpleIdentity from '../../src/modules/identity/RadixSimpleIdentity'
//
// describe('RLAU-572: MetaData in Atoms', () => {
//
//     const identityManager = RadixIdentityManager.byCreatingNewIdentity()
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
//     let nodeConnection: RadixNodeConnection
//
//     before(async () => {
//         RadixLogger.setLevel('error')
//
//         const universeConfig = RadixUniverse.LOCAL_SINGLE_NODE
//         await radixUniverse.bootstrapTrustedNode(universeConfig)
//
//         // Check node is available
//         try {
//             await universeConfig.nodeDiscovery.loadNodes()
//         } catch {
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
//         nodeConnection = await radixUniverse.getNodeConnection()
//     })
//
//     async function buildTestAtom(metaData: any) {
//         const atom = new RadixAtom()
//
//         // Add message particle
//         const particle = new RadixMessageParticle(
//             alice,
//             bob,
//             'hi',
//             {},
//         )
//         atom.particleGroups = [new RadixParticleGroup([RadixSpunParticle.up(particle)], {})]
//
//         // Set metaData
//         atom.metaData = metaData
//
//         // Add fee
//         const pow = await RadixFeeProvider.generatePOWFee(
//             radixUniverse.universeConfig.getMagic(),
//             atom,
//         )
//
//         if (atom.metaData instanceof Object) {
//             atom.setPowNonce(pow.nonce)
//         }
//
//         // Sign and return
//         return identity1.signAtom(atom)
//     }
//
//
//     it('1. should send a valid atom with some arbitrary metadata', function(done) {
//         buildTestAtom({
//             test1: 'some',
//             test2: 'metaData',
//         }).then((atom) => {
//             nodeConnection.submitAtom(atom).subscribe({
//                 next: (update) => {
//                     if (update.status === RadixAtomNodeStatus.STORED) {
//                         done()
//                     }
//                 },
//                 error: (e) => {
//                     console.log(e)
//                     done('Should have succeded')
//                 },
//             })
//         })
//     })
//
//     it('2. should send a valid atom with no metadata', function(done) {
//         buildTestAtom({}).then((atom) => {
//             nodeConnection.submitAtom(atom).subscribe({
//                 error: (e) => {
//                     console.log(e)
//                     done('Should have succeded')
//                 },
//                 next: (update) => {
//                     if (update.status === RadixAtomNodeStatus.STORED) {
//                         done()
//                     }
//                 },
//             })
//         })
//     })
//
//
//     it('4. should fail with invalid json', function(done) {
//         // Get a raw websocket
//         const socket = new WebSocket(nodeConnection.address)
//
//         socket.onopen = async function() {
//             socket.onmessage = function(event) {
//                 const response = JSON.parse(event.data)
//
//                 if ('error' in response) {
//                     done()
//                 }
//             }
//
//             // Get an atom
//             const metaDataVal = '123456'
//             const brokenMetaDataVal = '123"456'
//
//             buildTestAtom({
//                 test: metaDataVal,
//             }).then((atom) => {
//                 // Serialize and send
//                 const serializedAtom = RadixSerializer.toJSON(atom)
//
//                 const jsonRPCRequest = {
//                     jsonrpc: '2.0',
//                     id: 0,
//                     method: 'Universe.submitAtomAndSubscribe',
//                     params: {
//                         subscriberId: 0,
//                         atom: serializedAtom,
//                     },
//                 }
//
//                 const brokenRequest = JSON.stringify(jsonRPCRequest).replace(metaDataVal, brokenMetaDataVal)
//
//                 socket.send(brokenRequest)
//             })
//         }
//     })
//
//     it('5. should fail with wrong type metadata', function(done) {
//         // Set metadata as string instead of a map
//         buildTestAtom('( ͡° ͜ʖ ͡°)').then((atom) => {
//             nodeConnection.submitAtom(atom).subscribe({
//                 error: (e) => {
//                     expect(e.message).to.contain('Cannot deserialize')
//                     done()
//                 },
//                 complete: () => { done('Should have failed') },
//             })
//         })
//     })
// })
