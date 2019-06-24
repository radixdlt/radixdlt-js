import { expect } from 'chai'
import 'mocha'
import { RadixAddress, RadixEUID } from '..'
import { radixHash } from '../../common/RadixUtil'
import { RadixUniverseConfig } from '../../..';
import Long from 'long'

describe('RadixAddress', () => {

    it('different addresses from random seed has different private keys', () => {
        const address1 = RadixAddress.generateNew()
        const address2 = RadixAddress.generateNew()
        expect(address2.keyPair.getPrivate('hex')).to.not.equal(address1.keyPair.getPrivate('hex'))
    })

    it('different addresses from same string seed has same private key', () => {
        const seed = 'abc'
        const address1 = RadixAddress.fromPrivate(radixHash(Buffer.from(seed)))
        const address2 = RadixAddress.fromPrivate(radixHash(Buffer.from(seed)))
        expect(address2.keyPair.getPrivate('hex')).to.equal(address1.keyPair.getPrivate('hex'))
    })

    it('different addresses from same int-array seed has same private key', () => {
        const seed = [0x62, 0x75, 0x66, 0x66, 0x65, 0x72]
        const address1 = RadixAddress.fromPrivate(radixHash(Buffer.from(seed)))
        const address2 = RadixAddress.fromPrivate(radixHash(Buffer.from(seed)))
        expect(address2.keyPair.getPrivate('hex')).to.equal(address1.keyPair.getPrivate('hex'))
    })

    it('should create the correct address from a public key', () => {
        const address = RadixAddress.fromPublic(
            Buffer.from('A455PdOZNwyRWaSWFXyYYkbj7Wv9jtgCCqUYhuOHiPLC', 'base64'), 
            RadixUniverseConfig.LOCAL.getMagicByte(),
        )

        expect('JHB89drvftPj6zVCNjnaijURk8D8AMFw4mVja19aoBGmRXWchnJ').to.equal(address.toString())
    })

    it('should return the correct public key', () => {
        const address = RadixAddress.fromAddress('JHB89drvftPj6zVCNjnaijURk8D8AMFw4mVja19aoBGmRXWchnJ')
        address.getPublic().toString('base64')

        expect('A455PdOZNwyRWaSWFXyYYkbj7Wv9jtgCCqUYhuOHiPLC').to.equal(address.getPublic().toString('base64'))
    })

    it('should compute correct UID and shard', () => {
        const address = RadixAddress.fromAddress('JHB89drvftPj6zVCNjnaijURk8D8AMFw4mVja19aoBGmRXWchnJ')
        expect(new RadixEUID('8cfef50ea6a767813631490f9a94f73f')).to.deep.equal(address.getUID())
        expect(Long.fromString('-8286916821040797823')).to.deep.equal(address.getShard())
    })

    

})
