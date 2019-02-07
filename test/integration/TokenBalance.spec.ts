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

describe('Creating Token Classes', () => {
  RadixLogger.setLevel('error')

  const universeConfig = RadixUniverse.LOCAL

  radixUniverse.bootstrap(universeConfig)

  const identityManager = new RadixIdentityManager()

  const identity1 = identityManager.generateSimpleIdentity()
  const identity2 = identityManager.generateSimpleIdentity()

  const symbol = 'TBD'
  const name = 'my token name'
  const description = 'my token description'
  const granularity = new BN(1)

  const TBD_TOKENCLASS = new RadixTokenClass(identity1.address, symbol, name, description, granularity)
  const TBD_URI = `/${identity1.account.getAddress()}/tokenclasses/${symbol}`

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

    // // This take a long time
    // radixUniverse.closeAllConnections()
    // Soo just kill it 
    // process.exit(0)
  })

  it('Check for empty XRD balance', () => {
    expect(identity1.account.transferSystem.tokenUnitsBalance[radixTokenManager.nativeToken.toString()].toString()).to.eq('0')
  })

  it('Create a single issuance TBD token with account1', function (done) {
    this.timeout(50000)

    const amount = 500

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

  it('Send 5 TBD token to account2 and check new increased balance', function (done) {
    this.timeout(50000)

    RadixTransactionBuilder.createTransferAtom(
      identity1.account,
      identity2.account,
      TBD_TOKENCLASS,
      new Decimal(5),
    )
      .signAndSubmit(identity1)
      .subscribe({
        complete: () => done(),
        next: state => {
          if (state === 'STORED') {
            expect(identity2.account.transferSystem.tokenUnitsBalance[TBD_URI].toString()).to.eq('5')
          }
        },
        error: e => done(new Error(e)),
      })
  })

  it('Check that the balance in account1 has decreased after sending 5 TBD', function () {
    this.timeout(50000)

    expect(identity1.account.transferSystem.tokenUnitsBalance[TBD_URI].toString()).to.eq('995')
  })

})
