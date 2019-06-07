import { expect } from 'chai'
import 'mocha'
import { RadixAtom, RadixParticleGroup, RadixUniqueParticle, RadixAddress } from '.'
import { RadixSpunParticle } from './particles/RadixSpunParticle';


describe('Radix Atom model', () => {

    
    {
        const atom = new RadixAtom()
        atom.particleGroups = [new RadixParticleGroup([RadixSpunParticle.up(
            new RadixUniqueParticle(RadixAddress.generateNew(), 'test'),
        )])]
        
        it(`should compute hid`, () => {
            expect(atom.getAid.bind(atom)).to.not.throw()
        })
    }

    
})
