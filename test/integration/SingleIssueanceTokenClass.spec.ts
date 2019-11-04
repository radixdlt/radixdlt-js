import 'mocha'
import { expect } from 'chai'
import { doesNotReject } from 'assert'
import { identity, zip } from 'rxjs'
import { filter } from 'rxjs/operators'

import Decimal from 'decimal.js'
import BN from 'bn.js'
import axios from 'axios'

import {
  radixUniverse,
  radixTokenManager,
  logger,
  RadixUniverse,
  RadixIdentityManager,
  RadixTransactionBuilder,
  RadixAccount,
  RadixLogger,
  RadixTokenDefinition,
  RadixIdentity,
} from '../../src'


const ERROR_MESSAGE = 'Local node needs to be running to run these tests'

describe('RLAU-40: Single Issuance Token Class', () => {
    const identityManager = new RadixIdentityManager()
    let RLAU_URI: string
    let RLAU2_URI: string

    let identity1: RadixIdentity
    let identity2: RadixIdentity

    before(async () => {
        logger.setLevel('error')

        const universeConfig = RadixUniverse.LOCALHOST
        await radixUniverse.bootstrapTrustedNode(universeConfig)

        // Check node is available
        try {
            await universeConfig.nodeDiscovery.loadNodes()
        } catch (e) {
            console.error(e)
            const message = 'Local node needs to be running to run these tests'
            console.error(message)
            throw new Error(message)
        }

        identity1 = identityManager.generateSimpleIdentity()
        identity2 = identityManager.generateSimpleIdentity()

        RLAU_URI = `/${identity1.account.getAddress()}/RLAU`
        RLAU2_URI = `/${identity1.account.getAddress()}/RLAU2`
    })

    after(async () => {
        //
    })

    it('(1)(6) should create a single issuance token with symbol RLAU', function (done) {
        this.timeout(50000)

        const symbol = 'RLAU'
        const name = 'RLAU test'
        const description = 'my token description'
        const granularity = new Decimal('1e-18')
        const amount = 1000
        const iconUrl = 'http://a.b.com'

        new RadixTransactionBuilder().createTokenSingleIssuance(
            identity1.account,
            name,
            symbol,
            description,
            granularity,
            amount,
            iconUrl,
        )
        .signAndSubmit(identity1)
        .subscribe({
            complete: () => {
                // Check balance
                expect(identity1.account.transferSystem.tokenUnitsBalance[RLAU_URI].eq(amount)).to.be.true
                done()
            },
            error: e => done(new Error(JSON.stringify(e))),
        })
    })

    it('(2) should fail when creating a conflicting token with repeated symbol RLAU', function (done) {
        this.timeout(50000)

        const symbol = 'RLAU'
        const name = 'RLAU test'
        const description = 'my token description'
        const granularity = new Decimal('1e-18')
        const amount = 100000000
        const iconUrl = 'http://a.b.com'

        new RadixTransactionBuilder().createTokenSingleIssuance(
            identity1.account,
            name,
            symbol,
            description,
            granularity,
            amount,
            iconUrl,
        )
        .signAndSubmit(identity1)
        .subscribe({
            complete: () => done(new Error("This token shouldn't be created")),
            error: () => {
            done()
            },
        })
    })

    it('(3) should fail when creating a token with granularity 0', function () {
        this.timeout(50000)

        const symbol = 'RLAU0'
        const name = 'RLAU0 test'
        const description = 'my token description'
        const granularity = 0
        const amount = 100000000
        const iconUrl = 'http://a.b.com'

        expect(() => {
            new RadixTransactionBuilder().createTokenSingleIssuance(
                identity1.account,
                name,
                symbol,
                description,
                granularity,
                amount,
                iconUrl,
            )
        }).to.throw()
    })


    it('should fail when creating a token with granularity < 1e-18', function() {
        this.timeout(50000)

        const symbol = 'RLAU0'
        const name = 'RLAU0 test'
        const description = 'my token description'
        const granularity = new Decimal('1e-19')
        const amount = 100000000
        const iconUrl = 'http://a.b.com'

        expect(() => {
            new RadixTransactionBuilder().createTokenSingleIssuance(
                identity1.account,
                name,
                symbol,
                description,
                granularity,
                amount,
                iconUrl,
            )
        }).to.throw()
    })

    it('should fail when creating a token with supply not multiple of granularity', function() {
        this.timeout(50000)

        const symbol = 'RLAU0'
        const name = 'RLAU0 test'
        const description = 'my token description'
        const granularity = 1
        const amount = 1.5
        const iconUrl = 'http://a.b.com'

        expect(() => {
            new RadixTransactionBuilder().createTokenSingleIssuance(
                identity1.account,
                name,
                symbol,
                description,
                granularity,
                amount,
                iconUrl,
            )
        }).to.throw()
    })


    it('should fail when creating a token with no supply', function() {
        this.timeout(50000)

        const symbol = 'RLAU0'
        const name = 'RLAU0 test'
        const description = 'my token description'
        const granularity = 1
        const amount = 0
        const iconUrl = 'http://a.b.com'

        expect(() => {
            new RadixTransactionBuilder().createTokenSingleIssuance(
                identity1.account,
                name,
                symbol,
                description,
                granularity,
                amount,
                iconUrl,
            )
        }).to.throw()
    })

    it('should create a single issuance token with symbol RLAU2 and granularity 2', function(done) {
        this.timeout(50000)

        const symbol = 'RLAU2'
        const name = 'RLAU2 test'
        const description = 'my token description'
        const granularity = 2
        const amount = 20000000
        const iconUrl = 'http://a.b.com'

        new RadixTransactionBuilder().createTokenSingleIssuance(
            identity1.account,
            name,
            symbol,
            description,
            granularity,
            amount,
            iconUrl,
        )
        .signAndSubmit(identity1)
        .subscribe({
            complete: () => done(),
            error: e => done(new Error(JSON.stringify(e))),
        })
    })

    it('(4) should succeed transacting within granularity', function (done) {
        this.timeout(50000)

        try {
            RadixTransactionBuilder.createTransferAtom(
                identity1.account,
                identity2.account,
                RLAU2_URI,
                new Decimal(100),
                'test'
            )
                .signAndSubmit(identity1)
                .subscribe({
                complete: () => {
                    identity2.account.transferSystem.getAllTransactions().subscribe((txUpdate) => {
                        if (txUpdate.transaction.message === 'test') {
                            done()
                        }
                    })
                },
                error: e =>  done(new Error('This transaction should have been accepted')),
                })
        } catch (error) {
            done()
        }
    })

    it('(5) should fail when transacting with the wrong granularity', function (done) {
        this.timeout(50000)

        try {
            RadixTransactionBuilder.createTransferAtom(
            identity1.account,
            identity2.account,
            RLAU2_URI,
            new Decimal(1),
            )
            .signAndSubmit(identity1)
            .subscribe({
                complete: () => done(new Error('This transaction should have been rejected')),
                error: e => done(),
            })
        } catch (error) {
            done()
        }
    })

    it('should fail creating token with invalid icon url', function (done) {
        this.timeout(50000)

        const symbol = 'RLAU0'
        const name = 'RLAU0 test'
        const description = 'my token description'
        const granularity = 1
        const amount = 100000000
        const iconUrl = 'asdfg'

        new RadixTransactionBuilder().createTokenSingleIssuance(
            identity1.account,
            name,
            symbol,
            description,
            granularity,
            amount,
            iconUrl,
        )
        .signAndSubmit(identity1)
        .subscribe({
            complete: () => done(new Error("This token shouldn't be created")),
            error: () => done(),
        })
    })

})
