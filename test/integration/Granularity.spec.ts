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
  RadixTokenClassReference,
} from '../../src'

import { RadixDecryptionState } from '../../src/modules/account/RadixDecryptionAccountSystem'
import { RadixTokenClass } from '../../src/modules/token/RadixTokenClass'

const ERROR_MESSAGE = 'Local node needs to be running to run these tests'

describe('Single Issuance Token', () => {
  RadixLogger.setLevel('error')

  const universeConfig = RadixUniverse.LOCAL

  radixUniverse.bootstrap(universeConfig)

  const identityManager = new RadixIdentityManager()

  const identity1 = identityManager.generateSimpleIdentity()
  const identity2 = identityManager.generateSimpleIdentity()

  const RLAU2_URI = `/${identity1.account.getAddress()}/tokenclasses/RLAU2`

  before(async () => {
    // Check node is available
    try {
      await universeConfig.nodeDiscovery.loadNodes()
    } catch {
      logger.error(ERROR_MESSAGE)
      throw new Error(ERROR_MESSAGE)
    }

    await identity1.account.openNodeConnection()
    await identity2.account.openNodeConnection()
  })

  after(async () => {
    await identity1.account.closeNodeConnection()
    await identity2.account.closeNodeConnection()

    // // This take a long time
    // radixUniverse.closeAllConnections()
    // Soo just kill it 
    // process.exit(0)
  })

  it('should create a single issuance token with symbol RLAU', function (done) {
    this.timeout(50000)

    const symbol = 'RLAU'
    const name = 'RLAU test'
    const description = 'my token description'
    const granularity = new BN(1)
    const amount = 100000000

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

  it('should fail when creating a conflicting token with repeated symbol RLAU', function (done) {
    this.timeout(50000)

    const symbol = 'RLAU'
    const name = 'RLAU test'
    const description = 'my token description'
    const granularity = new BN(1)
    const amount = 100000000

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
        complete: () => done(new Error("This token shouldn't be created")),
        error: () => done(),
      })
  })

  it('should fail when creating a token with granularity 0', function (done) {
    this.timeout(50000)

    const symbol = 'RLAU0'
    const name = 'RLAU0 test'
    const description = 'my token description'
    const granularity = new BN(0)
    const amount = 100000000

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
        complete: () => done(new Error("This token shouldn't be created")),
        error: () => done(),
      })
  })

  it('should create a single issuance token with symbol RLAU2 and granularity 2', function (done) {
    this.timeout(50000)

    const symbol = 'RLAU2'
    const name = 'RLAU2 test'
    const description = 'my token description'
    const granularity = new BN(2)
    const amount = 20000000

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

  it('should fail when transacting with the wrong granularity', function (done) {
    this.timeout(50000)

    radixTokenManager.getTokenClass(RLAU2_URI)
      .then(rlau3TokenClass => {
        try {
          RadixTransactionBuilder.createTransferAtom(
            identity1.account,
            identity2.account,
            rlau3TokenClass,
            new Decimal(1),
          )
            .signAndSubmit(identity1)
            .subscribe({
              complete: () => done('This transaction should never happened'),
              error: e => done(),
            })
        } catch (error) {
          done()
        }
      })
      .catch(error => done(new Error(error)))
  })

})
