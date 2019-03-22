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
  RadixLogger,
  logger,
  RadixTokenDefinition,
} from '../../src'


const ERROR_MESSAGE = 'Local node needs to be running to run these tests'

describe('RLAU-97: Token classes in Account', () => {
    RadixLogger.setLevel('error')

    const universeConfig = RadixUniverse.LOCAL

    radixUniverse.bootstrap(universeConfig)

    const identityManager = new RadixIdentityManager()

    const identity1 = identityManager.generateSimpleIdentity()

    const tcd1_symbol = 'TCD1'
    const tcd1_name = 'TCD1 name'
    const tcd1_description = 'TCD1 description'
    const tcd1_granularity = new BN(1)
    const tcd1_amount = 10000

    const tcd2_symbol = 'TCD2'
    const tcd2_name = 'TCD2 name'
    const tcd2_description = 'TCD2 description'
    const tcd2_granularity = new BN(1)
    const tcd2_amount = 10000

    before(async () => {
        // Check node is available
        try {
        await universeConfig.nodeDiscovery.loadNodes()
        } catch {
        logger.error(ERROR_MESSAGE)
        throw new Error(ERROR_MESSAGE)
        }

        await identity1.account.openNodeConnection()
    })

    after(async () => {
        await identity1.account.closeNodeConnection()
    })

    it('should create a single issuance TCD1 token with account1', function (done) {
        this.timeout(50000)

        new RadixTransactionBuilder().createTokenSingleIssuance(
            identity1.account,
            tcd1_name,
            tcd1_symbol,
            tcd1_description,
            tcd1_granularity,
            tcd1_amount,
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
        tcd2_name,
        tcd2_symbol,
        tcd2_description,
        tcd2_granularity,
        tcd2_amount,
        )
        .signAndSubmit(identity1)
        .subscribe({
            complete: () => done(),
            error: e => done(new Error(JSON.stringify(e))),
        })
    })

    it('(1) check for token classes in account', function() {
        const tcd1TokenClass = identity1.account.tokenDefinitionSystem.getTokenDefinition(tcd1_symbol)

        expect(tcd1TokenClass.symbol).to.eq(tcd1_symbol)
        expect(tcd1TokenClass.name).to.eq(tcd1_name)
        expect(tcd1TokenClass.description).to.eq(tcd1_description)
        expect(tcd1TokenClass.getGranularity().toString()).to.eq(tcd1_granularity.toString())
        expect(tcd1TokenClass.totalSupply.toString()).to.eq(RadixTokenDefinition.fromDecimalToSubunits(tcd1_amount).toString())

        const tcd2TokenClass = identity1.account.tokenDefinitionSystem.getTokenDefinition(tcd2_symbol)

        expect(tcd2TokenClass.symbol).to.eq(tcd2_symbol)
        expect(tcd2TokenClass.name).to.eq(tcd2_name)
        expect(tcd2TokenClass.description).to.eq(tcd2_description)
        expect(tcd2TokenClass.getGranularity().toString()).to.eq(tcd2_granularity.toString())
        expect(tcd2TokenClass.totalSupply.toString()).to.eq(RadixTokenDefinition.fromDecimalToSubunits(tcd2_amount).toString())
    })

})
