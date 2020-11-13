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


import 'mocha'
import { expect } from 'chai'

import { RadixAccount } from '../..'

describe('RadixAccount', () => {

    it('account with known seed has expected address UID', () => {
        const seed = 'seed'
        const account = RadixAccount.fromSeed(Buffer.from(seed), true)

        // This is the hex-string value of the corresponding
        // RadixAddress UID generated by the Java library from
        // the UTF-8 bytes of the string "seed".
        const expectedAddressUID = 'fe1a0ad3c226be7fe3a3db2731a900ae'
        const actualAddressUID = account.address.getUID().toString()

        expect(actualAddressUID).to.equal(expectedAddressUID)
    })

    it('different accounts from same seed have same address', () => {
        const seed = 'seed'
        const account1 = RadixAccount.fromSeed(Buffer.from(seed), true)
        const account2 = RadixAccount.fromSeed(Buffer.from(seed), true)

        expect(account2.getAddress()).to.equal(account1.getAddress())
    })

})
