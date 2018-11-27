import { expect } from 'chai'
import 'mocha'
import { RadixUniqueQuark, RadixAddress, RadixFungibleType, RadixParticleIndex } from '..';


describe('RadixUniqueQuark', () => {
    
    {
        const quark = new RadixUniqueQuark(Buffer.from('123'))

        it(`should compute hid`, () => {
            expect(quark.getHID.bind(quark)).to.not.throw()
        })
    }

    
})
