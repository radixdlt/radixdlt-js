import sinon from 'sinon'

import { expect } from 'chai'
import { describe, beforeEach, before } from 'mocha'

import {
    radixUniverse,
    RadixUniverse,
    RadixAddress,
    RadixRemoteIdentity,
} from '../../index'

// Bootstrap the universe
radixUniverse.bootstrap(RadixUniverse.LOCALHOST)

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

        // This keypair pretends to be the local wallet address
        const address = RadixAddress.generateNew()

        const stubRegister = sinon.stub(RadixRemoteIdentity, 'register').resolves('any_token')
        const stubGetRemotePublicKey = sinon.stub(RadixRemoteIdentity, 'getRemotePublicKey').resolves(address.getPublic())
        const stubFromPublic = sinon.stub(RadixAddress, 'fromPublic').returns(address)

        RadixRemoteIdentity.createNew('my Dapp name', 'my Dapp description')
        .then((value) => {
            expect(value.address.getAddress()).to.eql(address.toString())
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
