/*
 * (C) Copyright 2020 Radix DLT Ltd
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the “Software”),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

import 'mocha'
import { expect } from 'chai'

import Decimal from 'decimal.js'

import {
    logger,
    RadixIdentity,
    RadixIdentityManager,
    RadixTokenDefinition,
    radixTokenManager,
    RadixTransactionBuilder,
    radixUniverse,
    RadixUniverse,
} from '../../src'
import { requestTestTokensFromFaucetAndUpdateBalanceOrDie } from '../../src/modules/common/TestUtils'

const ERROR_MESSAGE = 'Local node needs to be running to run these tests'

describe('TokenDefinitionManager', () => {

    const identityManager = new RadixIdentityManager()
    let identity1: RadixIdentity
    let TCD1_URI: string

    const tcd1Symbol = 'TCD1'
    const tcd1Name = 'TCD1 name'
    const tcd1Description = 'TCD1 description'
    const tcd1Granularity = new Decimal(1)
    const tcd1Amount = 0
    const tcd1ExtraAmount = 4000
    const tcd1BurnAmount = 3000
    const tcd1TokenUrl = 'http://a.b.com'
    const tcd1IconUrl = 'http://image.com'

    before(async function() {
        this.timeout(60_000)
        logger.setLevel('error')

        const universeConfig = RadixUniverse.LOCAL_SINGLE_NODE
        await radixUniverse.bootstrapTrustedNode(universeConfig)

        // Check node is available
        try {
            await universeConfig.nodeDiscovery.loadNodes()
        } catch {
        logger.error(ERROR_MESSAGE)
            throw new Error(ERROR_MESSAGE)
        }

        identity1 = identityManager.generateSimpleIdentity()

        await requestTestTokensFromFaucetAndUpdateBalanceOrDie(identity1.account)
        TCD1_URI = `/${identity1.account.getAddress()}/TCD1`
    })

    it('should create a single issuance TCD1 token with account1', function(done) {
        this.timeout(15000)

        new RadixTransactionBuilder().createTokenMultiIssuance(
            identity1.account,
            tcd1Name,
            tcd1Symbol,
            tcd1Description,
            tcd1Granularity,
            tcd1Amount,
            tcd1IconUrl,
            tcd1TokenUrl,
        )
            .signAndSubmit(identity1)
            .subscribe({
                complete: () => done(),
                error: e => done(new Error(JSON.stringify(e))),
        })
    })

    it('can query for valid token', function(done) {
        this.timeout(15000)

        radixTokenManager.getTokenDefinition(TCD1_URI).then(tokenClass => {
            expect(tokenClass.symbol).to.eq(tcd1Symbol)
            expect(tokenClass.name).to.eq(tcd1Name)
            expect(tokenClass.description).to.eq(tcd1Description)
            expect(tokenClass.getTokenUnitsGranularity().toString()).to.eq(tcd1Granularity.toString())
            expect(tokenClass.totalSupply.toString()).to.eq(RadixTokenDefinition.fromDecimalToSubunits(tcd1Amount).toString())
            
            done()
        }).catch(done)
    })

    it('can query invalid token', function(done) {
        radixTokenManager.getTokenDefinition('what even is this').then(_ => {
            done(new Error('Should not have found a token class'))
        }).catch(error => {
            expect(error.message).to.include('RRI must be of the format')
            done()
        })
    })

    it('can observing a token mint', function(done) {
        this.timeout(15000)

        
        radixTokenManager.getTokenDefinitionObservable(TCD1_URI).then(tokenClassObservable => {
            const expectedAmount = tcd1Amount + tcd1ExtraAmount
            
            const subscription = tokenClassObservable.subscribe(
                tokenClass => {
                    logger.debug('mint detected: ' + RadixTokenDefinition.fromSubunitsToDecimal(tokenClass.totalSupply))
                    if (RadixTokenDefinition.fromSubunitsToDecimal(tokenClass.totalSupply).eq(expectedAmount)) {
                        subscription.unsubscribe()
                        done()
                    }
                },
            )

            new RadixTransactionBuilder().mintTokens(
                identity1.account,
                TCD1_URI,
                tcd1ExtraAmount,
            ).signAndSubmit(identity1)
            .subscribe({
                error: e => done(new Error(JSON.stringify(e))),
            })
        }).catch(done)
    })


    it('can observe a token burn', function(done) {
        this.timeout(15000)

        
        radixTokenManager.getTokenDefinitionObservable(TCD1_URI).then(tokenClassObservable => {
            const expectedAmount = tcd1Amount + tcd1ExtraAmount - tcd1BurnAmount
            
            const subscription = tokenClassObservable.subscribe(
                tokenClass => {
                    if (RadixTokenDefinition.fromSubunitsToDecimal(tokenClass.totalSupply).eq(expectedAmount)) {
                        subscription.unsubscribe()
                        done()
                    }
                },
            )

            new RadixTransactionBuilder().burnTokens(
                identity1.account,
                TCD1_URI,
                tcd1BurnAmount,
            ).signAndSubmit(identity1)
            .subscribe({
                error: e => done(new Error(JSON.stringify(e))),
            })
        }).catch(done)
    })


    it('can query invalid token', function(done) {
        radixTokenManager.getTokenDefinition(TCD1_URI + 's').then(_ => {
            done(new Error('Shoudld not have found a token class'))
        }).catch(error => {
            expect(error.message).to.include('Token definition does not exist in the account')
            done()
        })
    })

})
