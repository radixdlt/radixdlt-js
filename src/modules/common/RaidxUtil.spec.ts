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

import Long from 'long'
import BN from 'bn.js'

import { expect } from 'chai'
import 'mocha'
import {
    byteArrayFromBigInt,
    bigIntFromByteArray,
    longFromBigInt,
    bigIntFromLong,
    powTargetFromAtomSize,
    isEmpty,
    sha256,
    sha256ByUTF8EncodingText
} from '../..'

const bi1 = new BN(0)
const ba1 = Buffer.from([0b00000000])
const long1 = Long.fromNumber(0)

const bi2 = new BN(2)
const ba2 = Buffer.from([0b00000010])
const long2 = Long.fromNumber(2)

const bi3 = new BN(-1)
const ba3 = Buffer.from([0b11111111])
const long3 = Long.fromNumber(-1)

const bi4 = new BN(16384)
const ba4 = Buffer.from([0b01000000, 0b00000000])
const long4 = Long.fromNumber(16384)

const bi5 = new BN(-32767)
const ba5 = Buffer.from([0b10000000, 0b00000001])
const long5 = Long.fromNumber(-32767)


const bi6 = new BN('-36279208777833252638946653')
const long6 = Long.fromString('2791931322524240547')

const bi7 = new BN('278483161383503547729998258')
// Java BigInteger.toByteArray adds a leading 0 byte here https://stackoverflow.com/a/24158695
const ba7 = Buffer.from('00E65B1A6DBAC7CE005071B2', 'hex')

describe('Big int => Byte array', () => {
    it('should convert big int to byte array', () => {
        expect(byteArrayFromBigInt(bi1)).to.deep.equal(ba1)
        expect(byteArrayFromBigInt(bi2)).to.deep.equal(ba2)
        expect(byteArrayFromBigInt(bi3)).to.deep.equal(ba3)
        expect(byteArrayFromBigInt(bi4)).to.deep.equal(ba4)
        expect(byteArrayFromBigInt(bi5)).to.deep.equal(ba5)
        expect(byteArrayFromBigInt(bi7)).to.deep.equal(ba7)
    })

    it('should convert byte array to bigint', () => {
        expect(bigIntFromByteArray(ba1).toString()).to.equal(
            bi1.toString()
        )
        expect(bigIntFromByteArray(ba2).toString()).to.equal(
            bi2.toString()
        )
        expect(bigIntFromByteArray(ba3).toString()).to.equal(
            bi3.toString()
        )
        expect(bigIntFromByteArray(ba4).toString()).to.equal(
            bi4.toString()
        )
        expect(bigIntFromByteArray(ba5).toString()).to.equal(
            bi5.toString()
        )
        expect(bigIntFromByteArray(ba7).toString()).to.equal(
            bi7.toString()
        )
    })
})

describe('Big int => Long', () => {
    it('should convert big int to long', () => {
        expect(longFromBigInt(bi1).toString()).to.equal(
            long1.toString()
        )
        expect(longFromBigInt(bi2).toString()).to.equal(
            long2.toString()
        )
        expect(longFromBigInt(bi3).toString()).to.equal(
            long3.toString()
        )
        expect(longFromBigInt(bi4).toString()).to.equal(
            long4.toString()
        )
        expect(longFromBigInt(bi5).toString()).to.equal(
            long5.toString()
        )
        expect(longFromBigInt(bi6).toString()).to.equal(
            long6.toString()
        )
    })

    it('should convert long to big int', () => {
        expect(bigIntFromLong(long1).toString()).to.equal(
            bi1.toString()
        )
        expect(bigIntFromLong(long2).toString()).to.equal(
            bi2.toString()
        )
        expect(bigIntFromLong(long3).toString()).to.equal(
            bi3.toString()
        )
        expect(bigIntFromLong(long4).toString()).to.equal(
            bi4.toString()
        )
        expect(bigIntFromLong(long5).toString()).to.equal(
            bi5.toString()
        )
    })
})

describe('POW Target', () => {
    it('should generate POW difficulty from atom size', () => {
        expect(powTargetFromAtomSize(4)).to.deep.equal(
            Buffer.from(
                '0FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
                'hex'
            )
        )
        expect(powTargetFromAtomSize(138)).to.deep.equal(
            Buffer.from(
                '00FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
                'hex'
            )
        )
        expect(powTargetFromAtomSize(373)).to.deep.equal(
            Buffer.from(
                '007FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
                'hex'
            )
        )
    })
})



describe('isEmpty', () => {
    it('should be true for empty object', () => {
        expect(isEmpty({})).to.equal(true)
    })

    it('should be true for empty array', () => {
        expect(isEmpty([])).to.equal(true)
    })

    it('should be true for undefined', () => {
        expect(isEmpty(undefined)).to.equal(true)
    })

    it('should be true for null', () => {
        expect(isEmpty(null)).to.equal(true)
    })

    it('should be false for nonempty object', () => {
        expect(isEmpty({a: 1})).to.equal(false)
    })

    it('should be false for nonempty array', () => {
        expect(isEmpty([1, 2, 3])).to.equal(false)
    })

    it('should be false for  false', () => {
        expect(isEmpty(false)).to.equal(false)
    })
})

describe(`sha256`, () => {
    it(`should match expected values`, () => {
        // From test vectors: https://www.di-mgt.com.au/sha_testvectors.html
        expect(
            sha256ByUTF8EncodingText('abc').toString('hex'),
        ).to.equal(
            'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
        )

        expect(
            sha256ByUTF8EncodingText('').toString('hex'),
        ).to.equal(
            'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        )

        expect(
            sha256ByUTF8EncodingText('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq').toString('hex'),
        ).to.equal(
            '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
        )

    })
})
