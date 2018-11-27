import { expect } from 'chai'
import 'mocha'
import { RadixChronoQuark, RadixAddress } from '..';


describe('RadixChronoQuark', () => {
    
    {
        const address = RadixAddress.generateNew()
        
        const quark = new RadixChronoQuark('abcdfgh', 2)

        it(`should compute hid`, () => {
            expect(quark.getHID.bind(quark)).to.not.throw()
        })
    }

    
})
