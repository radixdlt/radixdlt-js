import 'mocha'
import { expect } from 'chai'
import { doesNotReject } from 'assert'
import { identity, zip } from 'rxjs'
import { filter } from 'rxjs/operators'

import WebSocket from 'ws'

import {
    radixUniverse,
    RadixUniverse,
    RadixIdentityManager,
    RadixTransactionBuilder,
    RadixLogger,
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
    RadixTimestampParticle,
} from '../../src'

import { RadixDecryptionState } from '../../src/modules/account/RadixDecryptionAccountSystem'

describe('RLAU-572: MetaData in Atoms', () => {
    RadixLogger.setLevel('error')

    const universeConfig = RadixUniverse.LOCAL

    radixUniverse.bootstrap(universeConfig)

    const identityManager = new RadixIdentityManager()

    const identity1 = identityManager.generateSimpleIdentity()
    const identity2 = identityManager.generateSimpleIdentity()
    let nodeConnection: RadixNodeConnection

    before(async () => {
        // Check node is available
        try {
            await universeConfig.nodeDiscovery.loadNodes()
        } catch {
            const message = 'Local node needs to be running to run these tests'
            console.error(message)
            throw new Error(message)
        }

        await identity1.account.openNodeConnection()
        await identity2.account.openNodeConnection()
        nodeConnection = await radixUniverse.getNodeConnection(identity1.address.getShard())
    })

    after(async () => {
        await identity1.account.closeNodeConnection()
        await identity2.account.closeNodeConnection()
    })

    async function buildTestAtom(metaData: any) {
        const atom = new RadixAtom()

        // Add message particle
        const particle = new RadixMessageParticle(
            identity1.address,
            identity2.address,
            'hi',
            {},
        )
        atom.particleGroups = [new RadixParticleGroup([RadixSpunParticle.up(particle)], {})]

        // Add timestamp
        const timestampParticleGroup = new RadixParticleGroup([RadixSpunParticle.up(new RadixTimestampParticle(Date.now()))])
        atom.particleGroups.push(timestampParticleGroup)

        // Set metaData
        atom.metaData = metaData

        // Add fee
        const powFeeParticle = await RadixFeeProvider.generatePOWFee(
            radixUniverse.universeConfig.getMagic(),
            radixUniverse.powToken,
            atom,
            RadixAddress.fromPublic(nodeConnection.node.system.key.bytes),
        )

        const powFeeParticleGroup = new RadixParticleGroup([RadixSpunParticle.up(powFeeParticle)])
        atom.particleGroups.push(powFeeParticleGroup)
        
        // Sign and return
        return identity1.signAtom(atom)
    }


    it('1. should send a valid atom with some arbitrary metadata', function(done) {
        buildTestAtom({
            test1: 'some', 
            test2: 'metaData',
        }).then((atom) => {
            nodeConnection.submitAtom(atom).subscribe({
                error: (e) => {
                    console.log(e)
                    done('Should have succeded')
                },
                complete: () => { 
                    done() 
                },
            })
        })
    })

    it('2. should send a valid atom with no metadata', function(done) {
        buildTestAtom({}).then((atom) => {
            nodeConnection.submitAtom(atom).subscribe({
                error: (e) => {
                    console.log(e)
                    done('Should have succeded')
                },
                complete: () => { 
                    done() 
                },
            })
        })
    })
  

    it('3. should fail with too much metadata', function(done) {
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
  

    it('4. should fail with invalid json', function(done) {
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

    it('5. should fail with invalid wrong type in metadata', function(done) {
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
