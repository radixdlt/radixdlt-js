import { expect } from 'chai'
import { describe, beforeEach, before } from 'mocha'

import RadixServer from './server/RadixServer'

import {
    radixUniverse,
    RadixUniverse,
    RadixAddress,
    RadixMessage,
    RadixRemoteIdentity,
    RadixSimpleIdentity,
    RadixTransactionBuilder,
    RadixAccount,
    RadixLogger,
} from '../../src/index'

let server
let identity
let otherIdentity
let account
let otherAccount
let permissionlessIdentity
let permissionlessAccount

before(async () => {
    RadixLogger.setLevel('error')

    // Bootstrap the universe
    radixUniverse.bootstrap(RadixUniverse.LOCALHOST)

    server = new RadixServer()
    server.start()

    const permissions = ['get_public_key', 'decrypt_ecies_payload']

    identity = await RadixRemoteIdentity.createNew('dapp', 'dapp description', undefined, 'localhost', '54346')
    otherIdentity = new RadixSimpleIdentity(RadixAddress.generateNew())
    permissionlessIdentity = await RadixRemoteIdentity.createNew('dapp', 'dapp description', permissions, 'localhost', '54346')

    // Get accounts
    account = identity.account
    otherAccount = otherIdentity.account
    permissionlessAccount = permissionlessIdentity.account

    await account.openNodeConnection()
    await otherAccount.openNodeConnection()
    await permissionlessAccount.openNodeConnection()

    // Wait for the account & permisionlessAccount to sync data from the ledger
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

    it('should return true if the Desktop wallet is open', function (done) {
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

    it('should sign and send an atom', function (done) {
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

    it('should fail when signing an atom whithout the "sign_atom" permission', function (done) {
        this.timeout(20000)

        // Send a dummy message
        const transactionStatus = RadixTransactionBuilder
        .createRadixMessageAtom(permissionlessAccount, otherAccount, 'Foobar')
        .signAndSubmit(permissionlessIdentity)

        transactionStatus.subscribe({
        next: status => {
            // For a valid transaction, this will print, 'FINDING_NODE', 'GENERATING_POW', 'SIGNING', 'STORE', 'STORED'
            if (status === 'STORED') {
            done(`This message shouldn\'t be sent successfully`)
            }
        },
            error: error => {
                expect(error).to.deep.include({
                    message: 'Internal error',
                    code: -32603,
                    data: "Permission 'sign_atom' not granted", 
                })
                done()
            },
        })
    })

    it('should decrypt an encrypted message', function (done) {
        this.timeout(20000)

        const messages = account.messagingSystem.messages.values()
        const lastMessage = Array.from(messages)[messages.length - 1] as RadixMessage

        expect(lastMessage.content).is.eql('Foobar')

        done()
    })
})
