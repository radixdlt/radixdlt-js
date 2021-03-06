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

import { logger, RadixAtomNodeStatus, RadixIdentity, RadixIdentityManager, RadixTransactionBuilder, radixUniverse, RadixUniverse } from '../../src'
import { requestTestTokensFromFaucetAndUpdateBalanceOrDie, requestTestTokensFromFaucetOrDie } from '../../src/modules/common/TestUtils'


const ERROR_MESSAGE = 'Local node needs to be running to run these tests'

describe('UniqueParticle', () => {
    const identityManager = new RadixIdentityManager()

    let identity1: RadixIdentity
    let identity2: RadixIdentity
    let testTokenRef: string

    before(async function() {
        this.timeout(50_000)
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
        identity2 = identityManager.generateSimpleIdentity()

        testTokenRef = `/${identity1.account.getAddress()}/UNIQ`


        // Create token

        const symbol = 'UNIQ'
        const name = 'UNIQ test'
        const description = 'my token description'
        const granularity = 1
        const amount = 1000

        await requestTestTokensFromFaucetAndUpdateBalanceOrDie(identity1.account)

        await new RadixTransactionBuilder().createTokenMultiIssuance(
            identity1.account,
            name,
            symbol,
            description,
            granularity,
            amount,
            'http://image.com',
            'http://a.b.com',
        )
        .signAndSubmit(identity1)
        .toPromise()
    })

    it('should create an atom with a unique id', function(done) {
        this.timeout(50000)

        RadixTransactionBuilder.createMintAtom(
            identity1.account,
            testTokenRef,
            1)
        .addUniqueParticle(identity1.account, 'unique1')
        .signAndSubmit(identity1)
        .subscribe({
            complete: () => {
                done()
            },
            error: e => done(new Error(JSON.stringify(e))),
        })
    })

    it('should fail when submitting a unique particle for an unowned account', function(done) {
        this.timeout(50000)

        RadixTransactionBuilder.createMintAtom(
            identity1.account,
            testTokenRef,
            1)
        .addUniqueParticle(identity2.account, 'unique1')
        .signAndSubmit(identity1)
        .subscribe({
            complete: () => {
                done('Should have failed')
            },
            error: e => {
                expect(e.status).to.equal(RadixAtomNodeStatus.EVICTED_FAILED_CM_VERIFICATION)
                done()
            },
        })
    })

    it('should fail submitting an atom with a conflicting unique id', function(done) {
        this.timeout(50000)

        RadixTransactionBuilder.createMintAtom(
            identity1.account,
            testTokenRef,
            1)
        .addUniqueParticle(identity1.account, 'unique1')
        .signAndSubmit(identity1)
        .subscribe({
            complete: () => {
                done('Should have failed')
            },
            error: e => {
                expect(e.status).to.equal(RadixAtomNodeStatus.EVICTED_CONFLICT_LOSER_FINAL)
                done()
            },
        })
    })

    it('should succeed submitting an atom with multiple unique ids', function(done) {
        this.timeout(50000)

        RadixTransactionBuilder.createMintAtom(
            identity1.account,
            testTokenRef,
            1)
        .addUniqueParticle(identity1.account, 'unique2')
        .addUniqueParticle(identity1.account, 'unique3')
        .signAndSubmit(identity1)
        .subscribe({
            complete: () => {
                done()
            },
            error: e => done(new Error(JSON.stringify(e))),
        })
    })

    it('should fail when conflicting with one of the unique ids', function(done) {
        this.timeout(50000)

        RadixTransactionBuilder.createMintAtom(
            identity1.account,
            testTokenRef,
            1)
        .addUniqueParticle(identity1.account, 'unique2')
        .signAndSubmit(identity1)
        .subscribe({
            complete: () => {
                done('Should have failed')
            },
            error: e => {
                expect(e.status).to.equal(RadixAtomNodeStatus.EVICTED_CONFLICT_LOSER_FINAL)
                done()
            },
        })
    })

    it('should observe uniques in transfer system', function(done) {
        this.timeout(50000)

        RadixTransactionBuilder.createMintAtom(
            identity1.account,
            testTokenRef,
            1)
        .addUniqueParticle(identity1.account, 'unique5')
        .addUniqueParticle(identity1.account, 'unique6')
        .signAndSubmit(identity1)
        .subscribe({
            complete: () => {
                
                const unique = [
                    `/${identity1.account.getAddress()}/unique5`,
                    `/${identity1.account.getAddress()}/unique6`,
                ]
                
                expect(identity1.account.transferSystem.transactions.values().map(t => t.unique))
                    .to.deep.include(unique)

                done()
            },
            error: e => done(new Error(JSON.stringify(e))),
        })
    })

})
