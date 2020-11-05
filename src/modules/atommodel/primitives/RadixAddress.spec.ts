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

import { expect } from 'chai'
import 'mocha'
import { RadixAddress, RadixEUID, RRI } from '..'
import KeyPair from '../../crypto/KeyPair'
import PublicKey from '../../crypto/PublicKey'

export const generateNewAddressWithMagic = (magicByte: number): RadixAddress => {
    const keyPair = KeyPair.generateNew()
    return new RadixAddress(magicByte, keyPair.publicKey)
}

export const generateNewAddressWithRandomMagic = (): RadixAddress => {
    return generateNewAddressWithMagic(Math.random())
}

describe('RadixAddress', () => {

    it('should create the correct address from a public key', () => {
        const address = new RadixAddress(
            2,
            PublicKey.from('0279BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798'), // private key=1
        )

        expect('JF5FTU5wdsKNp4qcuFJ1aD9enPQMocJLCqvHE2ZPDjUNag8MKun').to.equal(address.toString())
    })

    it('should return the correct public key', () => {
        const address = RadixAddress.fromAddress('JHB89drvftPj6zVCNjnaijURk8D8AMFw4mVja19aoBGmRXWchnJ')
        address.getPublic().toString('base64')

        expect('A455PdOZNwyRWaSWFXyYYkbj7Wv9jtgCCqUYhuOHiPLC').to.equal(address.getPublic().toString('base64'))
    })

    it('should compute correct UID', () => {
        const address = RadixAddress.fromAddress('JHB89drvftPj6zVCNjnaijURk8D8AMFw4mVja19aoBGmRXWchnJ')
        expect(new RadixEUID('8cfef50ea6a767813631490f9a94f73f')).to.deep.equal(address.getUID())
    })

    it(`should use base58 representation when calling toString`, () => {
        const b58 = 'JHnGqXsMZpTuGwt1kU92mSpKasscJzfkkZJHe2vaEvBM3jJiVBq'
        const address = RadixAddress.fromAddress(b58)
        expect(address.toString()).to.equal(b58)
    })

})
