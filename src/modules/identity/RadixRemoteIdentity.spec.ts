import sinon from 'sinon'

import { expect } from 'chai'
import { describe, beforeEach, before } from 'mocha'

import {
  radixUniverse,
  RadixUniverse,
  RadixKeyPair,
  RadixRemoteIdentity,
} from '../../index'

// Bootstrap the universe
radixUniverse.bootstrap(RadixUniverse.ALPHANET)

describe('RadixRemoteIdentity', () => {

  it('should return false if the Desktop wallet is closed', function (done) {
    this.timeout(4000)

    const stub = sinon.stub(RadixRemoteIdentity, 'isServerUp').resolves(false)

    RadixRemoteIdentity.isServerUp()
      .then((value) => {
        expect(value).to.eql(false)
        done()
      })
      .catch((error) => {
        done(error)
      })
      .finally(() => {
        stub.restore()
      })
  })

  it('should return false if the Desktop wallet is open', function (done) {
    this.timeout(4000)

    const stub = sinon.stub(RadixRemoteIdentity, 'isServerUp').resolves(true)

    RadixRemoteIdentity.isServerUp()
      .then((value) => {
        expect(value).to.eql(true)
        done()
      })
      .catch((error) => {
        done(error)
      })
      .finally(() => {
        stub.restore()
      })
  })

  it('should create a new RadixRemoteIdentity with the same address that appears in the wallet', function (done) {
    this.timeout(4000)

    // This keypair pretends to be the local wallet keypair
    const keyPair = RadixKeyPair.fromAddress('9fskzSq4GwWjnzXrZFSJE3ZHjj5WHztBdQG4GKjMYAdAFfNWxt2')

    const stubRegister = sinon.stub(RadixRemoteIdentity, 'register').resolves('any_token')
    const stubGetRemotePublicKey = sinon.stub(RadixRemoteIdentity, 'getRemotePublicKey').resolves(keyPair.getPublic())
    const stubFromPublic = sinon.stub(RadixKeyPair, 'fromPublic').returns(keyPair)

    RadixRemoteIdentity.createNew('my Dapp name', 'my Dapp description')
      .then((value) => {
        expect(value.keyPair.getAddress()).to.eql('9fskzSq4GwWjnzXrZFSJE3ZHjj5WHztBdQG4GKjMYAdAFfNWxt2')
        done()
      })
      .catch((error) => {
        done(error)
      })
      .finally(() => {
        stubRegister.restore()
        stubGetRemotePublicKey.restore()
        stubFromPublic.restore()
      })
  })
})
