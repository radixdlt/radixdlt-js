import 'mocha'
import { expect } from 'chai'

import BN from 'bn.js'

import {
    RadixAddress,
    RadixMutableSupplyTokenDefinitionParticle,
    RadixTokenPermissionsValues,
    RRI,
} from '../..'

describe('RadixMutableSupplyTokenDefinitionParticle', () => {
    const address = RadixAddress.generateNew()
    const name = 'test token'
    const symbol = 'TEST'
    const description = 'very testy token'
    const granularity = new BN(1)
    const iconUrl = 'http://a.b.com'
    const permissions = {
        mint: RadixTokenPermissionsValues.TOKEN_OWNER_ONLY,
        burn: RadixTokenPermissionsValues.TOKEN_OWNER_ONLY,
    }

    const particle = new RadixMutableSupplyTokenDefinitionParticle(address, name, symbol, description, granularity, iconUrl, permissions)

    it(`should compute hid`, () => {
        expect(particle.getHid.bind(particle)).to.not.throw()
    })

    it(`should get addresses`, () => {
        expect(particle.getAddresses()).to.deep.equal([address])
    })

    it(`should get RRI`, () => {
        expect(particle.getRRI()).to.deep.equal(new RRI(address, symbol))
    })
})
