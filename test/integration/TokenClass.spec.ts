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
  RadixTokenClassReference,
  radixTokenManager,
} from '../../src'

import { RadixDecryptionState } from '../../src/modules/account/RadixDecryptionAccountSystem'
import { RadixTokenClass } from '../../src/modules/token/RadixTokenClass'

const ERROR_MESSAGE = 'Local node needs to be running to run these tests'

describe('RLAU-97: Token classes in Account', () => {
  RadixLogger.setLevel('debug')

  const universeConfig = RadixUniverse.LOCAL

  radixUniverse.bootstrap(universeConfig)

  const identityManager = new RadixIdentityManager()

  const identity1 = identityManager.generateSimpleIdentity()

  const TCD1_URI = `/${identity1.account.getAddress()}/tokenclasses/TCD1`
  const TCD2_URI = `/${identity1.account.getAddress()}/tokenclasses/TCD2`

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

    // // This take a long time
    // radixUniverse.closeAllConnections()
    // Soo just kill it 
    // process.exit(0)
  })

  it('should create a single issuance TCD1 token with account1', function (done) {
    this.timeout(50000)

    const symbol = 'TCD1'
    const name = 'TCD1 name'
    const description = 'TCD1 description'
    const granularity = new BN(1)
    const amount = 10000

    new RadixTransactionBuilder().createTokenSingleIssuance(
      identity1.account,
      name,
      symbol,
      description,
      granularity,
      amount,
    )
      .signAndSubmit(identity1)
      .subscribe({
        complete: () => done(),
        error: e => done(new Error(JSON.stringify(e))),
      })
  })

  it('should create a single issuance TCD2 token with account1', function(done) {
    this.timeout(50000)

    const symbol = 'TCD2'
    const name = 'TCD2 name'
    const description = 'TCD2 description'
    const granularity = new BN(1)
    const amount = 10000

    new RadixTransactionBuilder().createTokenSingleIssuance(
      identity1.account,
      name,
      symbol,
      description,
      granularity,
      amount,
    )
      .signAndSubmit(identity1)
      .subscribe({
        complete: () => done(),
        error: e => done(new Error(JSON.stringify(e))),
      })
  })

  it('query for TCD1 token class', function(done) {
    this.timeout(50000)

    radixTokenManager.getTokenClass(TCD1_URI)
      .then(tcd1TokenClass => {

        const symbol = 'TCD1'
        const name = 'TCD1 name'
        const description = 'TCD1 description'
        const granularity = new BN(1)
        const amount = 10000

        expect(tcd1TokenClass.symbol).to.eq(symbol)
        expect(tcd1TokenClass.name).to.eq(name)
        expect(tcd1TokenClass.description).to.eq(description)
        expect(tcd1TokenClass.getGranularity().toString()).to.eq(granularity.toString())
        expect(tcd1TokenClass.totalSupply.toString()).to.eq(RadixTokenClass.fromDecimalToSubunits(amount).toString())

        done()
      })
  })

  it('query for TCD2 token class', function(done) {
    this.timeout(50000)

    radixTokenManager.getTokenClass(TCD2_URI)
      .then(tcd2TokenClass => {
        const symbol = 'TCD2'
        const name = 'TCD2 name'
        const description = 'TCD2 description'
        const granularity = new BN(1)
        const amount = 10000

        expect(tcd2TokenClass.symbol).to.eq(symbol)
        expect(tcd2TokenClass.name).to.eq(name)
        expect(tcd2TokenClass.description).to.eq(description)
        expect(tcd2TokenClass.getGranularity().toString()).to.eq(granularity.toString())
        expect(tcd2TokenClass.totalSupply.toString()).to.eq(RadixTokenClass.fromDecimalToSubunits(amount).toString())

        done()
      })
  })
})
