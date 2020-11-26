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
import { v4 as uuidv4 } from 'uuid'

import Decimal from 'decimal.js'

import { RadixAccount, RadixAtomNodeStatusUpdate, RadixIdentity, RadixIdentityManager, RadixTransactionBuilder } from '../../src'
import { bootstrapUniverseGetDevTokens } from './Messaging.spec'
import { Observable } from 'rxjs'

describe('Create and transfer tokens', () => {

    let aliceIdentity: RadixIdentity
    let alice: RadixAccount
    let bobIdentity: RadixIdentity
    let bob: RadixAccount

    before(async function() {
        aliceIdentity = await bootstrapUniverseGetDevTokens()
        alice = aliceIdentity.account
        bobIdentity = new RadixIdentityManager().generateSimpleIdentity()
        bob  = bobIdentity.account
    })

    const rriForAliceTokenWithSymbol = (symbol: string): string => {
        return `/${alice.getAddress()}/${symbol}`
    }

    const aliceCreatesToken = (
        symbol: string,
        amount: number = 1000,
        granularity: number = 1,
    ): Observable<RadixAtomNodeStatusUpdate> => {

        const name = 'FOOBAR test'
        const description = 'my token description'
        const tokenUrl = 'http://a.b.com'
        const iconUrl = 'http://image.com'

        return new RadixTransactionBuilder().createTokenMultiIssuance(
            alice,
            name,
            symbol,
            description,
            granularity,
            amount,
            iconUrl,
            tokenUrl,
        )
            .signAndSubmit(aliceIdentity)
            .share()
    }

    it('should create a multi issuance token', function(done) {
        const amount = 1337
        const symbol = 'FOO'
        aliceCreatesToken(symbol, amount).subscribe({
            complete: () => {
                // Check balance
                const balance = alice.transferSystem.tokenUnitsBalance[rriForAliceTokenWithSymbol(symbol)]
                expect(balance.toString()).to.equal(amount.toString())
                done()
            },
            error: e => done(new Error(JSON.stringify(e))),
        })
    })

    it('should fail when creating a conflicting token with repeated symbol', function(done) {
        const reusedSymbol = 'BUZ'
        aliceCreatesToken(reusedSymbol).subscribe({

            complete: () => {
                aliceCreatesToken(reusedSymbol)
                    .subscribe({
                        complete: () => done(new Error("This token shouldn't be created")),
                        error: () => done(),
                    })
            },

            error: e => done(e),
        })
    })

    it('should fail when creating a token with granularity 0', function() {
        expect(() => {
            new RadixTransactionBuilder().createTokenSingleIssuance(
                alice,
                'Granularity of zero',
                'BADGRAN0',
                'Great coin',
                0,
                100000000,
                'http://a.b.com',
                'http://image.com',
            )
        }).to.throw()
    })

    it('should fail when creating a token with granularity < 1e-18', function() {
        const symbol = 'BADGRANBIG'
        const name = 'FOOBAR0 test'
        const description = 'my token description'
        const granularity = new Decimal('1e-19')
        const amount = 100000000
        const tokenUrl = 'http://a.b.com'
        const iconUrl = 'http://image.com'

        expect(() => {
            new RadixTransactionBuilder().createTokenSingleIssuance(
                alice,
                name,
                symbol,
                description,
                granularity,
                amount,
                iconUrl,
                tokenUrl,
            )
        }).to.throw()
    })

    it('should fail when creating a token with supply not multiple of granularity', function() {
        const symbol = 'BADGRANMULT'
        const name = 'FOOBAR0 test'
        const description = 'my token description'
        const granularity = 1
        const amount = 1.5
        const tokenUrl = 'http://a.b.com'
        const iconUrl = 'http://image.com'

        expect(() => {
            new RadixTransactionBuilder().createTokenSingleIssuance(
                alice,
                name,
                symbol,
                description,
                granularity,
                amount,
                iconUrl,
                tokenUrl,
            )
        }).to.throw()
    })

    it('should create a multi issuance token with granularity 2', function(done) {
        const symbol = 'GRAN2'
        const name = 'FOOBAR2 test'
        const description = 'my token description'
        const granularity = 2
        const amount = 20000000
        const tokenUrl = 'http://a.b.com'
        const iconUrl = 'http://image.com'

        new RadixTransactionBuilder().createTokenMultiIssuance(
            alice,
            name,
            symbol,
            description,
            granularity,
            amount,
            iconUrl,
            tokenUrl,
        )
            .signAndSubmit(aliceIdentity)
            .subscribe({
                complete: () => done(),
                error: e => done(new Error(JSON.stringify(e))),
            })
    })

    it('should succeed transacting within granularity', function(done) {

        this.timeout(25_000)

        const symbol = 'AWESOMECOIN'
        const supply = 10_000
        const amountToSend = 500

        const txMsg = uuidv4()

        aliceCreatesToken(symbol, supply)
            .toPromise()
            .then(tokenCreation => {
            RadixTransactionBuilder.createTransferAtom(
                alice,
                bob,
                rriForAliceTokenWithSymbol(symbol),
                amountToSend,
                txMsg,
            )
                .signAndSubmit(aliceIdentity)
                .toPromise()
                .catch(e => {
                    done(e)
                })
                .then(() => {
                    bob.transferSystem.getAllTransactions().take(1).toPromise()
                        .then((txUpdate) => {
                            if (txUpdate.transaction.message === txMsg) {
                                done()
                            } else {
                                done(new Error(`Incorrect tx message`))
                            }
                        })
                        .catch(e => {
                            done(new Error(`This transaction should have been accepted, but got error: ${e}`))
                        })
                })
        })
    })

    it('should fail when transacting with the wrong granularity', function(done) {
        this.timeout(15_000)
        const symbol = 'BADGRANTX'
        const rri = rriForAliceTokenWithSymbol(symbol)

        try {
            aliceCreatesToken(symbol, 3000, 3)
                .concat(
                    RadixTransactionBuilder.createTransferAtom(
                        alice,
                        bob,
                        rri,
                        2, // 2 is NOT a granularity of 3
                    ).signAndSubmit(aliceIdentity),
                )
                .subscribe({
                    complete: () => {
                        done(new Error('This transaction should have been rejected'))
                    },
                    error: e => { done() },
                })
        } catch (error) {
            done()
        }
    })

    it('should fail creating token with invalid icon url', function(done) {
        new RadixTransactionBuilder().createTokenMultiIssuance(
            alice,
            'Some name',
            'INVALIDURLTEST',
            'Invalid URL test',
            1,
            1000,
            'invalid_url', // INVALID URL
            'https://example.token.com',
        )
            .signAndSubmit(aliceIdentity)
            .subscribe({
                complete: () => done(new Error("This token shouldn't be created")),
                error: () => done(),
            })
    })

    it('should fail minting with the wrong identity', function(done) {
        const symbol = 'COINTOMINT'
        aliceCreatesToken(symbol)
        const rri = rriForAliceTokenWithSymbol(symbol)

        try {
            new RadixTransactionBuilder().mintTokens(
                alice,
                rri,
                1000,
            ).signAndSubmit(bobIdentity)
                .subscribe({
                    complete: () => { done('Should have failed') },
                    error: e => done(),
                })
        } catch (error) {
            done()
        }
    })
})
