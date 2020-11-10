import 'mocha'
import { expect } from 'chai'
import axios from 'axios'

import { logger, RadixAddress, RadixIdentityManager, RadixTransactionUpdate, radixUniverse, RadixUniverse } from '../../src'
import { flatMap, take, toArray } from 'rxjs/operators'
import Decimal from 'decimal.js'
import { map } from 'rxjs-compat/operator/map'

// Responds with AID for atom containing transfer
const getTokensFromFaucetURL = (radixAddress: RadixAddress): Promise<string> => {
    const faucetBaseURL = 'localhost:8079'
    const faucetURL = `http://${faucetBaseURL}/api/v1/getTokens/${radixAddress.toString()}`

    logger.error(`Trying to get tokens from faucet @ ${faucetURL}`)

    return httpGET(faucetURL)
        .then(response => {
                logger.error(`🚰 Radix faucet server success - response: ${JSON.stringify(response.data, null, 4)}`)
                return response.data
            },
        )
}

const httpGET = async (url: string): Promise<any> => {
    return axios.get(url)
}

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

    it(`sends me tokens`, function(done) {
        this.timeout(10_000)

        const start = +new Date()

        const alice = new RadixIdentityManager().generateSimpleIdentity()
        const xrdRRI = radixUniverse.nativeToken.toString()
        logger.error(`⏰ Alice=${alice.address.toString()}, requests XRDs from faucet`)
        getTokensFromFaucetURL(alice.address)
            .then(txString => {
                alice.account.transferSystem.getTokenUnitsBalanceUpdates()
                    .delay(1_000) // ms
                    .subscribe({
                        next: (balances) => {

                            logger.error(`✅ balances: ${JSON.stringify(balances, null, 4)}`)
                            const xrdBalance = balances[xrdRRI]
                            expect(xrdBalance > new Decimal(0)).to.be.true

                            alice.account.transferSystem.getTransactionWithUniqueString(`faucet-tx-${txString}`)
                                .timeout(1_000)
                                .subscribe(
                                    {
                                        next: (tx) => {
                                            logger.error(`GOT Tx ${JSON.stringify(tx, null, 4)}`)
                                            expect(tx.tokenUnitsBalance[xrdRRI].toString()).to.equal('10')
                                            expect(tx.to.toString()).to.equal(alice.address.toString())
                                            expect(tx.from.toString()).to.equal(radixUniverse.nativeToken.address.toString())

                                            done()
                                        },
                                        error: (e) => {
                                            logger.error(`ERROR no Tx ${e}`)
                                            done(e)
                                        },
                                    },
                                )


                        },
                        error: (e) => done(e),
                    })
            })
            .catch(error => done(error))
    })
})
