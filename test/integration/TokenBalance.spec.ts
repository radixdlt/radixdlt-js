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
  RadixUniverse,
  RadixIdentityManager,
  RadixTransactionBuilder,
  RadixAccount,
  RadixLogger,
  logger,
  radixTokenManager,
  RadixTokenDefinition,
} from '../../src'

const ERROR_MESSAGE = 'Local node needs to be running to run these tests'

describe('RLAU-91: Token balance updates', () => {
    RadixLogger.setLevel('error')

    const universeConfig = RadixUniverse.LOCAL

    radixUniverse.bootstrap(universeConfig)

    const identityManager = new RadixIdentityManager()

    const identity1 = identityManager.generateSimpleIdentity()
    const account2 = RadixAccount.fromAddress('JHnGqXsMZpTuGwt1kU92mSpKasscJzfkkZJHe2vaEvBM3jJiVBq')

    const TBD_URI = `/${identity1.account.getAddress()}/TBD`

    before(async () => {
        // Check node is available
        try {
            await universeConfig.nodeDiscovery.loadNodes()
        } catch {
            logger.error(ERROR_MESSAGE)
            throw new Error(ERROR_MESSAGE)
        }

        await identity1.account.openNodeConnection()
        await account2.openNodeConnection()
    })

    after(async () => {
        await identity1.account.closeNodeConnection()
    })

    it('(1) should check for empty XRD balance', () => {
        expect(identity1.account.transferSystem.tokenUnitsBalance[radixTokenManager.nativeToken.toString()].toString()).to.eq('0')
    })

    it('should create a single issuance TBD token with account1', function (done) {
        this.timeout(50000)

        const symbol = 'TBD'
        const name = 'my token name'
        const description = 'my token description'
        const granularity = RadixTokenDefinition.fromDecimalToSubunits(0.01)
        const amount = 500
        const iconUrl = 'http://a.b.com'

        new RadixTransactionBuilder().createTokenSingleIssuance(
            identity1.account,
            name,
            symbol,
            description,
            granularity,
            amount,
            iconUrl
        )
        .signAndSubmit(identity1)
        .subscribe({
            complete: () => done(),
            error: e => done(new Error(JSON.stringify(e))),
        })
    })

    it('(4)(2) should send 5 TBD token to account2 and check new increased balance', function (done) {
        this.timeout(50000)

        RadixTransactionBuilder.createTransferAtom(
            identity1.account,
            account2,
            TBD_URI,
            new Decimal(5),
            )
            .signAndSubmit(identity1)
            .subscribe({
                complete: () => done(),
                next: state => {
                if (state === 'STORED') {
                    expect(account2.transferSystem.tokenUnitsBalance[TBD_URI].toString()).to.eq('5')
                }
                },
                error: e => done(new Error(e)),
            })
        
    })

    it('(3) should check that the balance in account1 has decreased after sending 5 TBD', function () {
        this.timeout(50000)

        expect(identity1.account.transferSystem.tokenUnitsBalance[TBD_URI].toString()).to.eq('495')
    })

})