import 'mocha'
import { expect } from 'chai'

import { logger, RadixIdentityManager, RadixUniverse, radixUniverse } from '../../src'

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

describe.only(`Radix Faucet Service`, async function() {

    before(async function() {
        await bootstrapLocalhostAndConnectToNode()
    })

    it(`sends me tokens`, async function() {

        const alice = new RadixIdentityManager().generateSimpleIdentity()
        const xrdRRI = radixUniverse.nativeToken.toString()
        const tx = await alice.account.requestRadsForDevelopmentFromFaucetService()

        expect(tx.tokenUnitsBalance[xrdRRI].toString()).to.equal('10')
        expect(tx.to.toString()).to.equal(alice.address.toString())
        expect(tx.from.toString()).to.equal(radixUniverse.nativeToken.address.toString())
    })
})
