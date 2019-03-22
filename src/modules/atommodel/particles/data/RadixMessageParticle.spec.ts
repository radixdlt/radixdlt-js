import { expect } from 'chai'
import 'mocha'
import { RadixMessageParticle, RadixAddress } from '../..'


describe('RadixMessageParticle', () => {
    
    {
        const from = RadixAddress.generateNew()
        const to = RadixAddress.generateNew()
        const data = 'abc'
        const metaData = {a: 'b'}
        const addresses = [from, to]

        const particle = new RadixMessageParticle(from, to, data, metaData)
        // particle.getHID()

        it(`should compute hid`, () => {
            expect(particle.getHID.bind(particle)).to.not.throw()
        })

        it(`should get data`, () => {
            expect(particle.getData().toString()).to.equal(data)
        })
    
        it(`should get addresses`, () => {
            expect(particle.getAddresses()).to.deep.equal(addresses)
        })
    }

    
})
