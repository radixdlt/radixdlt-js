import { expect } from 'chai'
import 'mocha'

import { RadixECSignature } from '../atommodel'

describe(`DER decoding`, () => {
    it(`should work with length 70 (starting with 30 0x46=70)`, () => {
        const der = '3046022100efd48b2aacb6a8fd1140dd9cd45e81d69d2c877b56aaf991c34d0ea84eaf3716022100f7cb1c942d657c41d436c7a1b6e29f65f3e900dbb9aff4064dc4ab2f843acda8'
        const signature = RadixECSignature.fromDER(der)
        expect(signature.r.bytes.toString('hex')).to.equal('efd48b2aacb6a8fd1140dd9cd45e81d69d2c877b56aaf991c34d0ea84eaf3716')
        expect(signature.s.bytes.toString('hex')).to.equal('f7cb1c942d657c41d436c7a1b6e29f65f3e900dbb9aff4064dc4ab2f843acda8')
    })

    it(`should work with length 69 (starting with 30 0x45=69)`, () => {
        const der = '3045022100f1abb023518351cd71d881567b1ea663ed3efcf6c5132b354f28d3b0b7d383670220019f4113742a2b14bd25926b49c649155f267e60d3814b4c0cc84250e46f0083'
        const signature = RadixECSignature.fromDER(der)
        expect(signature.r.bytes.toString('hex')).to.equal('f1abb023518351cd71d881567b1ea663ed3efcf6c5132b354f28d3b0b7d38367')
        expect(signature.s.bytes.toString('hex')).to.equal('019f4113742a2b14bd25926b49c649155f267e60d3814b4c0cc84250e46f0083')
    })

    it(`should work with length 68 (starting with 30 0x44=68)`, () => {
        const der = '304402207063ae83e7f62bbb171798131b4a0564b956930092b33b07b395615d9ec7e15c022058dfcc1e00a35e1572f366ffe34ba0fc47db1e7189759b9fb233c5b05ab388ea'
        const signature = RadixECSignature.fromDER(der)
        expect(signature.r.bytes.toString('hex')).to.equal('7063ae83e7f62bbb171798131b4a0564b956930092b33b07b395615d9ec7e15c')
        expect(signature.s.bytes.toString('hex')).to.equal('58dfcc1e00a35e1572f366ffe34ba0fc47db1e7189759b9fb233c5b05ab388ea')
    })
})
