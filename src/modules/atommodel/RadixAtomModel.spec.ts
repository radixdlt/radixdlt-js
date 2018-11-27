import { expect } from 'chai'
import 'mocha'
import { RadixAtom } from '.'


describe('Radix Atom model', () => {

    
    {
        const atom = new RadixAtom()
        
        it(`should compute hid`, () => {
            expect(atom.getHID.bind(atom)).to.not.throw()
        })
    }

    
})
