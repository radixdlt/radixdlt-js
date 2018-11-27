import { expect } from 'chai'
import 'mocha'
import { RadixOwnableQuark, RadixAddress, RadixFungibleType, RadixParticleIndex } from '..';


describe('RadixOwnableQuark', () => {
    
    {
        const address = RadixAddress.generateNew()
        
        const quark = new RadixOwnableQuark(address.getPublic())

        it(`should compute hid`, () => {
            expect(quark.getHID.bind(quark)).to.not.throw()
        })
    }

    
})
