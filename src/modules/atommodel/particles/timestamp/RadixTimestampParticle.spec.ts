import { expect } from 'chai'
import 'mocha'
import {  RadixTimestampParticle } from '../..'
import { RadixAddress } from '../../primitives/RadixAddress';


describe('RadixTimestampParticle', () => {
    
    {
        const timestamp = 123

        const particle = new RadixTimestampParticle(timestamp)

        it(`should compute hid`, () => {
            expect(particle.getHID.bind(particle)).to.not.throw()
        })

        it(`should get timestamp`, () => {
            expect(particle.getTimestamp()).to.equal(timestamp)
        })
    
        it(`should get no addresses`, () => {
            expect(particle.getAddresses()).to.deep.equal([])
        })
    }

    
})
