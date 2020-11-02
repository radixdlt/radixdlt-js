/*
 * (C) Copyright 2020 Radix DLT Ltd
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the “Software”),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

import sinon from 'sinon'

import { expect } from 'chai'
import { describe, beforeEach, before } from 'mocha'

import {
    radixUniverse,
    RadixUniverse,
    RadixAddress,
    RadixRemoteIdentity,
} from '../../index'


describe('RadixRemoteIdentity', () => {

    before(async () => {
        // Bootstrap the universe
        await radixUniverse.bootstrapTrustedNode(RadixUniverse.LOCAL_SINGLE_NODE)
    })

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
