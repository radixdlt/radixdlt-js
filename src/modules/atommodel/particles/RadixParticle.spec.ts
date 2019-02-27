import { expect } from 'chai'
import 'mocha'
import { RadixMessageParticle, RadixAccountableQuark, RadixParticle } from '..'
import { RadixAddress } from '../primitives/RadixAddress';

describe('RadixParticle', () => {

    {
        const particle = new RadixMessageParticle(RadixAddress.generateNew(), '', {}, [RadixAddress.generateNew()])

        it(`should compute hid`, () => {
            expect(particle.getHID.bind(particle)).to.not.throw()
        })

        it(`should get quark`, () => {
            expect(particle.getQuarkOrError(RadixAccountableQuark)).to.be.a('object')
        })

        it(`should check if contains quark`, () => {
            expect(particle.containsQuark(RadixAccountableQuark)).to.equal(true)
        })
    }

})
