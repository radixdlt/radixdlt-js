import 'mocha'
import { expect } from 'chai'
import { doesNotReject } from 'assert'
import { identity, zip } from 'rxjs'
import { filter } from 'rxjs/operators'

import axios from 'axios'

import {
  radixUniverse,
  RadixUniverse,
  RadixIdentityManager,
  RadixTransactionBuilder,
  RadixLogger,
  RadixAccount,
} from '../../src'

import { RadixDecryptionState } from '../../src/modules/account/RadixDecryptionAccountSystem'

describe('MetaData in ParticleGroups', () => {
  RadixLogger.setLevel('error')

  const universeConfig = RadixUniverse.LOCAL

  radixUniverse.bootstrap(universeConfig)

  const identityManager = new RadixIdentityManager()

  const identity1 = identityManager.generateSimpleIdentity()
  const identity2 = identityManager.generateSimpleIdentity()

  before(async () => {
    // Check node is available
    try {
      await universeConfig.nodeDiscovery.loadNodes()
    } catch {
      const message = 'Local node needs to be running to run these tests'
      console.error(message)
      throw new Error(message)
    }

    await identity1.account.openNodeConnection()
    await identity2.account.openNodeConnection()
  })

  after(async () => {
    await identity1.account.closeNodeConnection()
    await identity2.account.closeNodeConnection()

    // This take a long time
    // radixUniverse.closeAllConnections()
    // Soo just kill it 
    // process.exit(0)
  })

  // TODO: add tests

})
