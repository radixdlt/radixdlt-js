import { expect } from 'chai'
import 'mocha'
import { RadixFungibleQuark, RadixAddress, RadixFungibleType } from '..';


describe('RadixFungibleQuark', () => {
    
    {
        const quark = new RadixFungibleQuark(1, 2, 3, RadixFungibleType.MINT)

        it(`should compute hid`, () => {
            expect(quark.getHID.bind(quark)).to.not.throw()
        })
    }

    
})
