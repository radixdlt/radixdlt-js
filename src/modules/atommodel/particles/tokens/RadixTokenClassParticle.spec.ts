import 'mocha'
import { expect } from 'chai'

import BN from 'bn.js'

import {
    RadixFungibleType,
    RadixTokenClassReference,
    RadixAddress,
    RadixTokenClassParticle,
    RadixTokenPermissions,
    RadixTokenPermissionsValues,
} from '../..'

describe('RadixTokenClassParticle', () => {
    const address = RadixAddress.generateNew()
    const name = 'test token'
    const symbol = 'TEST'
    const description = 'very testy token'
    const granularity = new BN(1)
    const permissions = {
        mint: RadixTokenPermissionsValues.TOKEN_OWNER_ONLY,
        transfer: RadixTokenPermissionsValues.ALL,
        burn: RadixTokenPermissionsValues.TOKEN_OWNER_ONLY,
    }

    const particle = new RadixTokenClassParticle(address, name, symbol, description, granularity, permissions)

    it(`should compute hid`, () => {
        expect(particle.getHID.bind(particle)).to.not.throw()
    })

    it(`should get addresses`, () => {
        expect(particle.getAddresses()).to.deep.equal([address])
    })

    it(`should get token reference`, () => {
        expect(particle.getTokenClassReference()).to.deep.equal(new RadixTokenClassReference(address, symbol))
    })
})
