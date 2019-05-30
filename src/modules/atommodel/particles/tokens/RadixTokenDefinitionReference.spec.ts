import { expect } from 'chai'
import 'mocha'
import {  RadixAddress, RadixTokenDefinitionReference } from '../..'
import { radixUniverse, RadixUniverse } from '../../../..';


describe('RadixTokenClassReference', () => {

    radixUniverse.bootstrap(RadixUniverse.LOCAL)
    
    {
        const address = RadixAddress.generateNew()
        const symbol = 'TEST'

        const tokenReference = new RadixTokenDefinitionReference(address, symbol)

        it(`should compute hid`, () => {
            expect(tokenReference.getHID.bind(tokenReference)).to.not.throw()
        })

        it(`should stringify`, () => {
            expect(tokenReference.toString()).to.equal(`/${address.toString()}/tokens/${symbol}`)
        })

        it('should parse string uri correctly', () => {
            expect(RadixTokenDefinitionReference.fromString(tokenReference.toString()).toString()).to.equal(tokenReference.toString())
        })
    }
})
