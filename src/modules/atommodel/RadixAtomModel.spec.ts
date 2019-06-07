import { expect } from 'chai'
import 'mocha'
import { RadixAtom, RadixParticleGroup, RadixUniqueParticle, RadixAddress } from '.'
import { RadixSpunParticle } from './particles/RadixSpunParticle';


describe('Radix Atom model', () => {

    
    {
        const atom = new RadixAtom()
        const address1 = RadixAddress.generateNew()
        const address2 = RadixAddress.generateNew()

        atom.particleGroups = [new RadixParticleGroup([
            RadixSpunParticle.up(new RadixUniqueParticle(address1, 'test')),
            RadixSpunParticle.up(new RadixUniqueParticle(address2, 'test2')),
        ])]

        it(`should compute shards`, () => {
            const shards = atom.getShards()

            expect(shards).to.be.lengthOf(2)
        })

        it(`should compute addresses`, () => {
            const addresses = atom.getAddresses()
            
            expect(addresses).to.deep.equal([address1, address2])
        })

        it(`should compute AID`, () => {
            const aid = atom.getAid()
            expect(aid.toString()).to.be.lengthOf(64)
        })
    }

    
})
