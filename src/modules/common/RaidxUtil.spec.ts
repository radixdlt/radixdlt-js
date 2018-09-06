import RadixUtil from './RadixUtil'

import * as BN from 'bn.js'
import * as Long from 'long'

import { expect } from 'chai'
import 'mocha'

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

describe('Big int => Byte array', () => {
  it('should convert big int to byte array', () => {
    expect(RadixUtil.byteArrayFromBigInt(bi1)).to.deep.equal(ba1)
    expect(RadixUtil.byteArrayFromBigInt(bi2)).to.deep.equal(ba2)
    expect(RadixUtil.byteArrayFromBigInt(bi3)).to.deep.equal(ba3)
    expect(RadixUtil.byteArrayFromBigInt(bi4)).to.deep.equal(ba4)
    expect(RadixUtil.byteArrayFromBigInt(bi5)).to.deep.equal(ba5)
  })

  it('should convert byte array to bigint', () => {
    expect(RadixUtil.bigIntFromByteArray(ba1).toString()).to.equal(
      bi1.toString()
    )
    expect(RadixUtil.bigIntFromByteArray(ba2).toString()).to.equal(
      bi2.toString()
    )
    expect(RadixUtil.bigIntFromByteArray(ba3).toString()).to.equal(
      bi3.toString()
    )
    expect(RadixUtil.bigIntFromByteArray(ba4).toString()).to.equal(
      bi4.toString()
    )
    expect(RadixUtil.bigIntFromByteArray(ba5).toString()).to.equal(
      bi5.toString()
    )
  })
})

describe('Big int => Long', () => {
  it('should convert big int to long', () => {
    expect(RadixUtil.longFromBigInt(bi1).toString()).to.equal(long1.toString())
    expect(RadixUtil.longFromBigInt(bi2).toString()).to.equal(long2.toString())
    expect(RadixUtil.longFromBigInt(bi3).toString()).to.equal(long3.toString())
    expect(RadixUtil.longFromBigInt(bi4).toString()).to.equal(long4.toString())
    expect(RadixUtil.longFromBigInt(bi5).toString()).to.equal(long5.toString())
    expect(RadixUtil.longFromBigInt(bi6).toString()).to.equal(long6.toString())
  })

  it('should convert long to big int', () => {
    expect(RadixUtil.bigIntFromLong(long1).toString()).to.equal(bi1.toString())
    expect(RadixUtil.bigIntFromLong(long2).toString()).to.equal(bi2.toString())
    expect(RadixUtil.bigIntFromLong(long3).toString()).to.equal(bi3.toString())
    expect(RadixUtil.bigIntFromLong(long4).toString()).to.equal(bi4.toString())
    expect(RadixUtil.bigIntFromLong(long5).toString()).to.equal(bi5.toString())
  })
})

describe('POW Target', () => {
  it('should generate POW difficulty from atom size', () => {
    expect(RadixUtil.powTargetFromAtomSize(4)).to.deep.equal(
      Buffer.from(
        '0FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
        'hex'
      )
    )
    expect(RadixUtil.powTargetFromAtomSize(138)).to.deep.equal(
      Buffer.from(
        '00FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
        'hex'
      )
    )
    expect(RadixUtil.powTargetFromAtomSize(373)).to.deep.equal(
      Buffer.from(
        '007FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
        'hex'
      )
    )
  })
})
