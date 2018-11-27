import { expect } from 'chai'
import 'mocha'
import { RadixAccountableQuark, RadixAddress } from '..';


describe('RadixAccountableQuark', () => {
    
    {
        const address = RadixAddress.generateNew()
        
        const quark = new RadixAccountableQuark([address])

        it(`should compute hid`, () => {
            expect(quark.getHID.bind(quark)).to.not.throw()
        })
    }

    
})
