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

import {
    radixUniverse,
    RadixUniverse,
    RadixIdentityManager,
    RadixTransactionBuilder,
    RadixAccount,
    RadixLogger,
    logger,
    RadixIdentity,
} from '../../src'
const ERROR_MESSAGE = 'Local node needs to be running to run these tests'

describe('Token transfers', () => {
    const identityManager = new RadixIdentityManager()

    let identity1: RadixIdentity
    let account2: RadixAccount
    let TBD_URI: string

    before(async () => {
        RadixLogger.setLevel('error')

        const universeConfig = RadixUniverse.LOCALHOST
        await radixUniverse.bootstrapTrustedNode(universeConfig)

        // Check node is available
        try {
            await universeConfig.nodeDiscovery.loadNodes()
        } catch {
            logger.error(ERROR_MESSAGE)
            throw new Error(ERROR_MESSAGE)
        }

        identity1 = identityManager.generateSimpleIdentity()
        account2 = RadixAccount.fromAddress('JHnGqXsMZpTuGwt1kU92mSpKasscJzfkkZJHe2vaEvBM3jJiVBq')
        TBD_URI = `/${identity1.account.getAddress()}/TBD`
    })

    it('should create a single issuance TBD token with account1', function (done) {
        this.timeout(50000)

        const symbol = 'TBD'
        const name = 'my token name'
        const description = 'my token description'
        const granularity = 0.01
        const amount = 500
        const tokenUrl = 'http://a.b.com'
        const iconUrl = 'http://image.com'

        new RadixTransactionBuilder().createTokenSingleIssuance(
            identity1.account,
            name,
            symbol,
            description,
            granularity,
            amount,
            tokenUrl,
            iconUrl,
        )
            .signAndSubmit(identity1)
            .subscribe({
                complete: () => done(),
                error: e => done(new Error(JSON.stringify(e))),
            })
    })

    it('should throw an error when trying to send to self', function () {
        expect(() => {
            RadixTransactionBuilder.createTransferAtom(
                identity1.account,
                identity1.account,
                TBD_URI,
                5,
            )
        }).to.throw()
    })

    it('should throw an error when trying to send negative amount', function () {
        expect(() => {
            RadixTransactionBuilder.createTransferAtom(
                identity1.account,
                account2,
                TBD_URI,
                -1,
            )
        }).to.throw()
    })

    it('should throw an error when trying to send zero', function () {
        expect(() => {
            RadixTransactionBuilder.createTransferAtom(
                identity1.account,
                account2,
                TBD_URI,
                0,
            )
        }).to.throw()
    })

    it('should throw an error when trying to send too many tokens', function () {
        expect(() => {
            RadixTransactionBuilder.createTransferAtom(
                identity1.account,
                account2,
                TBD_URI,
                5000000,
            )
        }).to.throw()
    })

    it('should mint and transfer tokens', async function () {
        this.timeout(50000)

        const symbol = 'TBA'
        const name = 'my token name'
        const description = 'my token description'
        const granularity = 0.01
        const amount = 500
        const tokenUrl = 'http://a.b.com'
        const iconUrl = 'http://image.com'
        const TBA_URI = `/${identity1.account.getAddress()}/TBA`

        const createToken = new RadixTransactionBuilder().createTokenMultiIssuance(
            identity1.account,
            name,
            symbol,
            description,
            granularity,
            amount,
            iconUrl,
            tokenUrl,
        ).signAndSubmit(identity1).toPromise()

        await createToken

        expect(identity1.account.transferSystem.tokenUnitsBalance[TBA_URI].toString()).to.eq('500')
        expect(account2.transferSystem.tokenUnitsBalance[TBA_URI]).to.be.undefined

        const mintAndTransfer = new RadixTransactionBuilder().mintTokens(
            identity1.account,
            TBA_URI,
            4000,
            account2,
            'message',
        ).signAndSubmit(identity1).toPromise()

        await mintAndTransfer

        expect(identity1.account.transferSystem.tokenUnitsBalance[TBA_URI].toString()).to.eq('500')
        expect(account2.transferSystem.tokenUnitsBalance[TBA_URI].toString()).to.eq('4000')
    })

})
