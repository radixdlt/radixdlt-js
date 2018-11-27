import { expect } from 'chai'
import 'mocha'
import { RadixDataQuark, RadixAddress } from '..';


describe('RadixDataQuark', () => {
    
    {
        const quark = new RadixDataQuark('a', {})

        it(`should compute hid`, () => {
            quark.getHID()
            expect(quark.getHID.bind(quark)).to.not.throw()
        })
    }

    
})
