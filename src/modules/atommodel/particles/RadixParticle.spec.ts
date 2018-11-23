import { expect } from 'chai'
import 'mocha'
import { RadixMessageParticle, RadixAccountableQuark, RadixChronoQuark, RadixDataQuark, RadixParticle } from '../RadixAtomModel'
import { RadixAddress } from '../primitives/RadixAddress';


describe('RadixParticle', () => {

    
    {
        const particle = new RadixMessageParticle(RadixAddress.generateNew(), '', {}, [RadixAddress.generateNew()])
        it(`should get quark`, () => {
            expect(particle.getQuarkOrError(RadixAccountableQuark)).to.be.a('object')
        })
    
        it(`should error if cannot get quark`, () => {
            expect(() => particle.getQuarkOrError(RadixChronoQuark)).to.throw()
        })

        it(`should check if contains quark`, () => {
            expect(particle.containsQuark(RadixAccountableQuark)).to.equal(true)
        })
    
        it(`should check if doesn't contain quark`, () => {
            expect(particle.containsQuark(RadixChronoQuark)).to.equal(false)
        })
    }


    {
        const chronoQuark1 = new RadixChronoQuark('a', 1)
        const chronoQuark2 = new RadixChronoQuark('b', 2)
        const dataQuark = new RadixDataQuark('', {})

        const particle = new RadixParticle(chronoQuark1, chronoQuark2, dataQuark)

        it(`should return all quarks`, () => {
            expect(particle.quarks).to.have.lengthOf(3)
        })

        it(`should filter 1 quark`, () => {
            expect(particle.getQuarks(RadixDataQuark)).to.have.lengthOf(1)
        })

        it(`should filter 2 quarks`, () => {
            expect(particle.getQuarks(RadixChronoQuark)).to.have.lengthOf(2)
        })

        it(`should filter no quarks`, () => {
            expect(particle.getQuarks(RadixAccountableQuark)).to.have.lengthOf(0)
        })
    }

    
})
