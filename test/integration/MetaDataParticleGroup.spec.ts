import 'mocha'
import { expect } from 'chai'
import { doesNotReject } from 'assert'
import { identity, zip } from 'rxjs'
import { filter } from 'rxjs/operators'

import WebSocket from 'ws'

import axios from 'axios'

import {
  radixUniverse,
    RadixUniverse,
    RadixIdentityManager,
    RadixTransactionBuilder,
    logger,
    RadixAccount,
    RadixSerializer,
    RadixNodeConnection,
    RadixAtom,
    RadixMessageParticle,
    RadixSpunParticle,
    RadixParticleGroup,
    RadixSpin,
    RadixFeeProvider,
    RadixAddress,
    RadixIdentity,
    RadixAtomNodeStatus,
} from '../../src'

import { RadixDecryptionState } from '../../src/modules/account/RadixDecryptionAccountSystem'

describe('RLAU-572: MetaData in ParticleGroups', () => {

    const identityManager = new RadixIdentityManager()

    let identity1: RadixIdentity
    let identity2: RadixIdentity
    let nodeConnection: RadixNodeConnection

    before(async () => {
        logger.setLevel('error')

        const universeConfig = RadixUniverse.LOCALHOST
        radixUniverse.bootstrap(universeConfig)

        // Check node is available
        try {
            await universeConfig.nodeDiscovery.loadNodes()
        } catch {
            const message = 'Local node needs to be running to run these tests'
            console.error(message)
            throw new Error(message)
        }

        identity1 = identityManager.generateSimpleIdentity()
        identity2 = identityManager.generateSimpleIdentity()

        nodeConnection = await radixUniverse.getNodeConnection(identity1.address.getShard())
    })

    after(async () => {
        //
    })

    async function buildTestAtom(metaData: any) {
        const atom = new RadixAtom()

        // Add message particle with particle group metaData
        const particle = new RadixMessageParticle(
            identity1.address,
            identity2.address,
            'hi',
            {},
        )
        atom.particleGroups = [new RadixParticleGroup([RadixSpunParticle.up(particle)], metaData)]
        atom.metaData = {}

        // Add timestamp
        atom.setTimestamp(Date.now())
        

        // Add fee
        const pow = await RadixFeeProvider.generatePOWFee(
            radixUniverse.universeConfig.getMagic(),
            atom,
        )

        atom.setPowNonce(pow.nonce)
        
        // Sign and return
        return identity1.signAtom(atom)
    }

    it('6. should send a valid atom with particle groups which have some arbitrary metadata', function(done) {
        buildTestAtom({
            test1: 'some', 
            test2: 'metaData',
        }).then((atom) => {
            nodeConnection.submitAtom(atom).subscribe({
                error: (e) => {
                    console.log(e)
                    done('Should have succeded')
                },
                next: (update) => {
                    if (update.status === RadixAtomNodeStatus.STORED) {
                        done()
                    }
                },
            })
        })
    })

    it('7. should send a valid atom with particle groups which have no metadata', function(done) {
        buildTestAtom({}).then((atom) => {
            nodeConnection.submitAtom(atom).subscribe({
                error: (e) => {
                    console.log(e)
                    done('Should have succeded')
                },
                next: (update) => {
                    if (update.status === RadixAtomNodeStatus.STORED) {
                        done()
                    }
                },
            })
        })    
    })

    it('8. should fail with particle groups which have too much metadata', function(done) {
        // X = 1 byte
        let hugeMetaData = ''
        for (let i = 0; i < 65536; i++) {
            hugeMetaData += 'X'
        }

        buildTestAtom({
            massive: hugeMetaData,
        }).then((atom) => {
            nodeConnection.submitAtom(atom).subscribe({
                error: (e) => { done() },
                complete: () => { done('Should have failed') },
            })
        })
    })

    it('9. should fail with particle groups which have invalid json', function(done) {
        // Get a raw websocket
        const socket = new WebSocket(nodeConnection.address)

        socket.onopen = async function() {
            socket.onmessage = function(event) {
                const response = JSON.parse(event.data)

                if ('error' in response) {
                    done()
                }
            }

            // Get an atom
            const metaDataVal = '123456'
            const brokenMetaDataVal = '123"456'

            buildTestAtom({
                test: metaDataVal,
            }).then((atom) => {
                // Serialize and send
                const serializedAtom = RadixSerializer.toJSON(atom)

                const jsonRPCRequest = {
                    jsonrpc: '2.0',
                    id: 0,
                    method: 'Universe.submitAtomAndSubscribe',
                    params: {
                        subscriberId: 0,
                        atom: serializedAtom,
                    },
                }

                const brokenRequest = JSON.stringify(jsonRPCRequest).replace(metaDataVal, brokenMetaDataVal)

                socket.send(brokenRequest)
            })
        }
    })

    it('10. should fail with particle groups which have invalid type metadata', function(done) {
        // Set metadata as string instead of a map
        buildTestAtom('( ͡° ͜ʖ ͡°)').then((atom) => {
            nodeConnection.submitAtom(atom).subscribe({
                error: (e) => {
                    expect(e.message).to.contain('Cannot deserialize')
                    done()
                },
                complete: () => { done('Should have failed') },
            })
        })
    })
})
