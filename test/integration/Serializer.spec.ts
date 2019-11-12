import 'mocha'
import { expect } from 'chai'

import {
    radixUniverse,
    RadixUniverse,
    RadixIdentityManager,
    RadixTransactionBuilder,
    RadixLogger,
    logger,
    RadixIdentity,
} from '../../src'

const ERROR_MESSAGE = 'Local node needs to be running to run these tests'

describe('Serializer', () => {
    const identityManager = new RadixIdentityManager()
    let identity1: RadixIdentity

    before(async () => {
        RadixLogger.setLevel('error')

        const universeConfig = RadixUniverse.LOCALHOST
        radixUniverse.bootstrapTrustedNode(universeConfig)

        try {
            await universeConfig.nodeDiscovery.loadNodes()
        } catch {
            logger.error(ERROR_MESSAGE)
            throw new Error(ERROR_MESSAGE)
        }

        identity1 = identityManager.generateSimpleIdentity()
    })

    it('should properly serialize and submit a payload above 16kb', done => {
        const appId = 'test'
        let payload = ''
        for (let i = 0; i < 20000; i++) {
            payload += 'X'
        }

        const txBuilder = RadixTransactionBuilder.createPayloadAtom(
            identity1.account,
            [identity1.account],
            appId,
            payload,
            false,
        )

        const dson = txBuilder.buildAtom().toDSON().toString('hex')

        expect(dson.substring(dson.length - 2)).to.equal('ff')
        
        txBuilder.signAndSubmit(identity1).subscribe({
            complete: () => done(),
            error: e => done(new Error(JSON.stringify(e))),
        })
    })
})
