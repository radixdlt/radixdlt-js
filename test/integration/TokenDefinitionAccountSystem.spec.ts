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

    const tcd1Symbol = 'TCD1'
    const tcd1Name = 'TCD1 name'
    const tcd1Description = 'TCD1 description'
    const tcd1Granularity = new BN(1)
    const tcd1Amount = 10000
    const tcd1IconUrl = 'http://a.b.com'

    const tcd2Symbol = 'TCD2'
    const tcd2Name = 'TCD2 name'
    const tcd2Description = 'TCD2 description'
    const tcd2Granularity = new BN(1)
    const tcd2Amount = 10000
    const tcd2IconUrl = 'http://a.b.com'

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
            tcd1Name,
            tcd1Symbol,
            tcd1Description,
            tcd1Granularity,
            tcd1Amount,
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
        expect(tcd1TokenClass.getGranularity().toString()).to.eq(tcd1Granularity.toString())
        expect(tcd1TokenClass.totalSupply.toString()).to.eq(RadixTokenDefinition.fromDecimalToSubunits(tcd1Amount).toString())

        const tcd2TokenClass = identity1.account.tokenDefinitionSystem.getTokenDefinition(tcd2Symbol)

        expect(tcd2TokenClass.symbol).to.eq(tcd2Symbol)
        expect(tcd2TokenClass.name).to.eq(tcd2Name)
        expect(tcd2TokenClass.description).to.eq(tcd2Description)
        expect(tcd2TokenClass.getGranularity().toString()).to.eq(tcd2Granularity.toString())
        expect(tcd2TokenClass.totalSupply.toString()).to.eq(RadixTokenDefinition.fromDecimalToSubunits(tcd2Amount).toString())
    })

})
