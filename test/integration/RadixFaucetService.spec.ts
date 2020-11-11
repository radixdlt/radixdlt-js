import 'mocha'
import { expect } from 'chai'
import axios from 'axios'

import { logger, RadixAddress, RadixIdentityManager, RadixTransactionUpdate, radixUniverse, RadixUniverse } from '../../src'
import { flatMap, take, toArray } from 'rxjs/operators'
import Decimal from 'decimal.js'
import { map } from 'rxjs-compat/operator/map'

// Responds with AID for atom containing transfer

// const httpGet = async (url: string): string => {
//     const xmlHttp = new XMLHttpRequest()
//
//     xmlHttp.open(
//         'GET',
//         url,
//         true,
//     )
//
//     xmlHttp.send(null)
//
//     return xmlHttp.responseText
// }

const ERROR_MESSAGE = 'Local node needs to be running to run these tests'


describe.only(`Radix Faucet Service`, async function() {

    before(async function() {
        const universeConfig = RadixUniverse.LOCAL_SINGLE_NODE
        await radixUniverse.bootstrapTrustedNode(universeConfig)

        // Check node is available
        try {
            await universeConfig.nodeDiscovery.loadNodes()
        } catch {
            logger.error(ERROR_MESSAGE)
            throw new Error(ERROR_MESSAGE)
        }
    })

    beforeEach(function() {
        this.timeout(5_000)
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
