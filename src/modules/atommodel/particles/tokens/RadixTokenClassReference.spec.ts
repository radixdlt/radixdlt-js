import { expect } from 'chai'
import 'mocha'
import {  RadixFungibleType, RadixTokenClassReference, RadixAddress, RadixTokenClassParticle, RadixTokenPermissions } from '../..'
import { radixUniverse, RadixUniverse } from '../../../..';


describe('RadixTokenClassReference', () => {
    radixUniverse.bootstrap(RadixUniverse.SUNSTONE)
    
    {
        const address = RadixAddress.generateNew()
        const symbol = 'TEST'

        const tokenReference = new RadixTokenClassReference(address, symbol)

        it(`should compute hid`, () => {
            expect(tokenReference.getHID.bind(tokenReference)).to.not.throw()
        })

        it(`should stringify`, () => {
            expect(tokenReference.toString()).to.equal(`${address.toString()}/@${symbol}`)
        })

        it('should parse string uri correctly', () => {
            expect(RadixTokenClassReference.fromString(tokenReference.toString()).toString()).to.equal(tokenReference.toString())
        })
    }

    
})
