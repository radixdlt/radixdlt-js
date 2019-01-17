import sinon from 'sinon'

import { expect } from 'chai'
import { describe, beforeEach, before } from 'mocha'

import RadixServer from '../../../test/integration/server/RadixServer'

import {
  radixUniverse,
  RadixUniverse,
  RadixAddress,
  RadixMessage,
  RadixRemoteIdentity,
  RadixSimpleIdentity,
  RadixTransactionBuilder,
  RadixAccount,
} from '../../index'

let server
let identity
let otherIdentity
let account
let otherAccount

before(async () => {
  // Bootstrap the universe
  radixUniverse.bootstrap(RadixUniverse.LOCAL)

  server = new RadixServer()
  server.start()

  // identityManager = new RadixIdentityManager()

  identity = await RadixRemoteIdentity.createNew('dapp', 'dapp description', 'localhost', '54346')
  otherIdentity = new RadixSimpleIdentity(RadixAddress.generateNew())

  // Get accounts
  account = identity.account
  otherAccount = otherIdentity.account

  await account.openNodeConnection()

  // Wait for the account to sync data from the ledger
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

  it('should create a new RadixRemoteIdentity with the same address that appears in the wallet when the user approves permissions', function (done) {
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

  it('should sign and send an ', function (done) {
    this.timeout(20000)

    // Send a dummy message
    const transactionStatus = RadixTransactionBuilder
      .createRadixMessageAtom(account, otherAccount, 'Foobar')
      .signAndSubmit(identity)

    transactionStatus.subscribe({
      next: status => {
        // For a valid transaction, this will print, 'FINDING_NODE', 'GENERATING_POW', 'SIGNING', 'STORE', 'STORED'
        if (status === 'STORED') {
          done()
        }
      },
      error: error => {
        done(error)
      },
    })
  })

  it('should decrypt an encrypted message', function (done) {
    this.timeout(4000)

    otherAccount.messagingSystem.getAllMessages().subscribe(messageUpdate => {
      const messages = otherAccount.messagingSystem.messages.values()
      const lastMessage = Array.from(messages)[messages.length - 1] as RadixMessage
      expect(lastMessage.content).is.eql('Foobar')
      done()
    })

    // Send a dummy message
    const transactionStatus = RadixTransactionBuilder
      .createRadixMessageAtom(account, otherAccount, 'Foobar')
      .signAndSubmit(identity)
  })
})
