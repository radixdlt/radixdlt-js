import 'mocha'
import { expect } from 'chai'

import { RadixFungibleQuark, RadixAddress, RadixFungibleType, RadixUInt256 } from '..'


describe('RadixFungibleQuark', () => {
    
    {
        const quark = new RadixFungibleQuark(new RadixUInt256(1), 2, 3, RadixFungibleType.MINT)

        it(`should compute hid`, () => {
            expect(quark.getHID.bind(quark)).to.not.throw()
        })
    }
    
})
