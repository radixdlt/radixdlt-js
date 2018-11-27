import { expect } from 'chai'
import 'mocha'
import { RadixNonFungibleQuark, RadixAddress, RadixFungibleType, RadixParticleIndex, RadixTokenClassReference } from '..';


describe('RadixNonFungibleQuark', () => {
    
    {
        const address = RadixAddress.generateNew()
        
        const quark = new RadixNonFungibleQuark(new RadixTokenClassReference(address, 'TEST'))
        quark.getHID()

        it(`should compute hid`, () => {
            expect(quark.getHID.bind(quark)).to.not.throw()
        })
    }

    
})
