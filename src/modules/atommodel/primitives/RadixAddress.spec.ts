import { expect } from 'chai'
import 'mocha'
import { RadixAddress } from '..'
import { radixHash } from '../../common/RadixUtil'

describe('RadixAddress', () => {

    it('fifferent addresses from random seed has different private keys', () => {
        const address1 = RadixAddress.generateNew()
        const address2 = RadixAddress.generateNew()
        expect(address2.keyPair.getPrivate('hex')).to.not.equal(address1.keyPair.getPrivate('hex'))
    })

    it('fifferent addresses from same string seed has same private key', () => {
        const seed = 'abc'
        const address1 = RadixAddress.fromPrivate(radixHash(Buffer.from(seed)))
        const address2 = RadixAddress.fromPrivate(radixHash(Buffer.from(seed)))
        expect(address2.keyPair.getPrivate('hex')).to.equal(address1.keyPair.getPrivate('hex'))
    })

    it('fifferent addresses from same int-array seed has same private key', () => {
        const seed = [0x62, 0x75, 0x66, 0x66, 0x65, 0x72]
        const address1 = RadixAddress.fromPrivate(radixHash(Buffer.from(seed)))
        const address2 = RadixAddress.fromPrivate(radixHash(Buffer.from(seed)))
        expect(address2.keyPair.getPrivate('hex')).to.equal(address1.keyPair.getPrivate('hex'))
    })

})
