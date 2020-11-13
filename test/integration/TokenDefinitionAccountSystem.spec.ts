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
    RadixLogger,
    RadixTokenDefinition,
    RadixTransactionBuilder,
    radixUniverse,
    RadixUniverse
} from '../../src'


const ERROR_MESSAGE = 'Local node needs to be running to run these tests'

describe('TokenDefinitionAccountSystem', () => {

    const identityManager = new RadixIdentityManager()
    let identity1: RadixIdentity

    const tcd1Symbol = 'TCD1'
    const tcd1Name = 'TCD1 name'
    const tcd1Description = 'TCD1 description'
    const tcd1Granularity = new Decimal(1)
    const tcd1Amount = 10000
    const tcd1IconUrl = 'http://image.com/1'
    const tcd1TokenUrl = 'http://a.b.com'

    const tcd2Symbol = 'TCD2'
    const tcd2Name = 'TCD2 name'
    const tcd2Description = 'TCD2 description'
    const tcd2Granularity = new Decimal(1)
    const tcd2Amount = 10000
    const tcd2TokenUrl = 'http://a.b.com'
    const tcd2IconUrl = 'http://image.com'

    before(async () => {
        RadixLogger.setLevel('error')
    
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

        await identity1.account.requestRadsForDevelopmentFromFaucetService()
    })

    it('should create a single issuance TCD1 token with account1', function (done) {
        this.timeout(50000)

        new RadixTransactionBuilder().createTokenSingleIssuance(
            identity1.account,
            tcd1Name,
            tcd1Symbol,
            tcd1Description,
            tcd1Granularity,
            tcd1Amount,
            tcd1TokenUrl,
            tcd1IconUrl,
        )
            .signAndSubmit(identity1)
            .subscribe({
                complete: () => done(),
                error: e => done(new Error(JSON.stringify(e))),
        })
    })

    it('should create a single issuance TCD2 token with account1', function(done) {
        this.timeout(50000)

        new RadixTransactionBuilder().createTokenSingleIssuance(
            identity1.account,
            tcd2Name,
            tcd2Symbol,
            tcd2Description,
            tcd2Granularity,
            tcd2Amount,
            tcd2TokenUrl,
            tcd2IconUrl,
        )
        .signAndSubmit(identity1)
        .subscribe({
            complete: () => done(),
            error: e => done(new Error(JSON.stringify(e))),
        })
    })

    it('(1) check for token classes in account', function() {
        const tcd1TokenClass = identity1.account.tokenDefinitionSystem.getTokenDefinition(tcd1Symbol)

        expect(tcd1TokenClass.symbol).to.eq(tcd1Symbol)
        expect(tcd1TokenClass.name).to.eq(tcd1Name)
        expect(tcd1TokenClass.description).to.eq(tcd1Description)
        expect(tcd1TokenClass.getTokenUnitsGranularity().toString()).to.eq(tcd1Granularity.toString())
        expect(tcd1TokenClass.totalSupply.toString()).to.eq(RadixTokenDefinition.fromDecimalToSubunits(tcd1Amount).toString())

        const tcd2TokenClass = identity1.account.tokenDefinitionSystem.getTokenDefinition(tcd2Symbol)

        expect(tcd2TokenClass.symbol).to.eq(tcd2Symbol)
        expect(tcd2TokenClass.name).to.eq(tcd2Name)
        expect(tcd2TokenClass.description).to.eq(tcd2Description)
        expect(tcd2TokenClass.getTokenUnitsGranularity().toString()).to.eq(tcd2Granularity.toString())
        expect(tcd2TokenClass.totalSupply.toString()).to.eq(RadixTokenDefinition.fromDecimalToSubunits(tcd2Amount).toString())
    })

})
