import 'mocha'
import { expect } from 'chai'

import BN from 'bn.js'

import {
    RadixAddress,
    RRI,
    RadixFixedSupplyTokenDefinitionParticle,
} from '../..'

describe('RadixFixedSupplyTokenDefinitionParticle', () => {
    const address = RadixAddress.generateNew()
    const name = 'test token'
    const symbol = 'TEST'
    const description = 'very testy token'
    const supply = new BN(1000000)
    const granularity = new BN(1)
    const iconUrl = 'http://a.b.com'

    const particle = new RadixFixedSupplyTokenDefinitionParticle(address, name, symbol, description, supply, granularity, iconUrl)

    it(`should compute hid`, () => {
        expect(particle.getHid.bind(particle)).to.not.throw()
    })

    it(`should get addresses`, () => {
        expect(particle.getAddresses()).to.deep.equal([address])
    })

    it(`should get rri`, () => {
        expect(particle.getRRI()).to.deep.equal(new RRI(address, symbol))
    })
})
