import 'mocha'
import { expect } from 'chai'

import { logger, RadixAccount, RadixIdentity, RadixIdentityManager, RadixUniverse, radixUniverse } from '../../src'

export const assertConnectedToNode = async () => {
    try {
        await radixUniverse.nodeDiscovery.loadNodes()
    } catch {
        const errorMessage = 'Local node needs to be running to run these tests'
        logger.error(errorMessage)
        throw new Error(errorMessage)
    }
}

export const bootstrapLocalhostAndConnectToNode = async () => {
    await radixUniverse.bootstrapTrustedNode(RadixUniverse.LOCAL_SINGLE_NODE)
    await assertConnectedToNode()

}

describe(`Radix Faucet Service`, async function() {


    let aliceIdentity: RadixIdentity
    let alice: RadixAccount

    before(async function() {
        await bootstrapLocalhostAndConnectToNode()

        aliceIdentity = new RadixIdentityManager().generateSimpleIdentity()
        alice = aliceIdentity.account
    })

    after(function() {
        alice.unsubscribeSubscribers()
    })

    it(`sends me tokens`, async function() {

        const xrdRRI = radixUniverse.nativeToken.toString()
        const tx = await alice.requestRadsForDevelopmentFromFaucetService()

        expect(tx.tokenUnitsBalance[xrdRRI].toString()).to.equal('10')
        expect(tx.to.toString()).to.equal(alice.address.toString())
        expect(tx.from.toString()).to.equal(radixUniverse.nativeToken.address.toString())
    })
})
