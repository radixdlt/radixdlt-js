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

import { logger, RadixAtom } from '../../src'
import RadixApplicationClient from '../../src/modules/radix-application-client/RadixApplicationClient'
import { Runnable } from 'mocha'
import { Observable, Subscription } from 'rxjs'

const oneSec = 1_000
const threeSec = 3_000

describe('PutUnique', () => {

    let aliceAPIClient: RadixApplicationClient

    const alreadyUsedUnique = 'ALREADYUSED'

    before(async function() {
        aliceAPIClient = await RadixApplicationClient.createByBootstrapingTrustedNode()

        await aliceAPIClient
            .putUnique(alreadyUsedUnique)
            .catch(error => {
                throw new Error(`
                        Failed to run beforeAll on test suite ${this.test.fullTitle()},
                        got unexpected error ${error}, 
                        this will probably mean that some tests below will fail.
                    `)
            })

    })

    beforeEach(function() {
        this.timeout(oneSec)
    })

    const shortStringFrom = (long: string, takeFirst?: number): string => {
        const noSpaceString = long.split(' ').join('0') // replaceAll
        if (!takeFirst) {
            return noSpaceString
        }
        return noSpaceString.slice(0, takeFirst)
    }

    it('should be possible to submit an atom with uniqueness', async function() {
        await aliceAPIClient.putUnique(shortStringFrom(this.test.title))
    })

    it('should fail submitting an atom with a conflicting unique id', function(done) {

        this.timeout(threeSec)

        aliceAPIClient.observePutUnique(alreadyUsedUnique)
            .subscribe({
                complete: () => {
                    logger.error(`EXPECTED TO FAIL, BUT GOT SUCCESS`)
                    done(new Error(`Expected to fail`))
                },
                error: (_) => {
                    done() // we expect an error
                },
            })
    })

    /*

    it('(3) should succeed submitting an atom with multiple unique ids', function (done) {
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

    it('(3b) should fail when conflicting with one of the unique ids', function (done) {
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

    it('(4) should fail submitting an atom with multiple conflicing unique ids', function (done) {
        this.timeout(50000)

        RadixTransactionBuilder.createMintAtom(
            identity1.account,
            testTokenRef,
            1)
        .addUniqueParticle(identity1.account, 'unique4')
        .addUniqueParticle(identity1.account, 'unique4')
        .signAndSubmit(identity1)
        .subscribe({
            complete: () => {
                done('Should have failed')
            },
            error: e => {
                // Atom causes multiple conflicts (this is temporary, ask Florian)
                // expect(e).to.contain('unique require compromised')
                done()
            },
        })
    })

    it('(5) should observe uniques in transfer system', function (done) {
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
*/
})
