import sinon from 'sinon'

import { expect } from 'chai'
import { describe, beforeEach, before } from 'mocha'

import RadixServer from '../../../test/server/RadixServer'

import {
  radixUniverse,
  RadixUniverse,
  RadixAddress,
  RadixRemoteIdentity,
} from '../../index'

let server
let identity

before(async () => {
  // Bootstrap the universe
  radixUniverse.bootstrap(RadixUniverse.LOCAL)

  server = new RadixServer()
  server.start()

  identity = await RadixRemoteIdentity.createNew('dapp', 'dapp description', 'localhost', '54346')
})

describe('RadixRemoteIdentity', () => {

  it('should return false if the Desktop wallet is closed', function (done) {
    this.timeout(4000)

    // Try a port different from 54346 that's where our server is running
    RadixRemoteIdentity.isServerUp('localhost', '2525')
      .then((value) => {
        expect(value).to.eql(false)
        done()
      })
      .catch((error) => {
        done(error)
      })
  })

  it('should return false if the Desktop wallet is open', function (done) {
    this.timeout(4000)

    RadixRemoteIdentity.isServerUp('localhost', '54346')
      .then((value) => {
        expect(value).to.eql(true)
        done()
      })
      .catch((error) => {
        done(error)
      })
  })

  it('should create a new RadixRemoteIdentity with the same address that appears in the wallet', function (done) {
    this.timeout(4000)

    const remoteIdentityAddress = RadixAddress.fromPublic(identity.getPublicKey()).getAddress()
    RadixRemoteIdentity.getRemotePublicKey(identity.token, 'localhost', '54346')
      .then((walletPublicKey) => {
        const walletAddress = RadixAddress.fromPublic(walletPublicKey).getAddress()
        expect(remoteIdentityAddress).to.eql(walletAddress)
        done()
      })
      .catch((error) => {
        done(error)
      })
  })
})
