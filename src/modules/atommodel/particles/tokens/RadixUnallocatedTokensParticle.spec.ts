import 'mocha'
import { expect } from 'chai'

import BN from 'bn.js'

import {
    RadixFungibleType,
    RadixAddress,
    RRI,
    RadixTransferrableTokensParticle,
    RadixTokenPermissionsValues,
    RadixUnallocatedTokensParticle,
} from '../..'

describe('RadixUnallocatedTokensParticle', () => {
    const amount = new BN(123)
    const type = RadixFungibleType.TRANSFER
    const address = RadixAddress.generateNew()
    const nonce = 456
    const tokenReference = new RRI(address, 'TEST')
    const planck = 789
    const granularity = new BN(1)
    const permissions = {
        mint: RadixTokenPermissionsValues.TOKEN_CREATION_ONLY,
        burn: RadixTokenPermissionsValues.ALL,
    }

    const particle = new RadixUnallocatedTokensParticle(amount, granularity, nonce, tokenReference, permissions)

    it(`should compute hid`, () => {
        expect(particle.getHID.bind(particle)).to.not.throw()
    })

    it(`should get type`, () => {
        expect(particle.getType()).to.equal(type)
    })

    it(`should get nonce`, () => {
        expect(particle.getNonce()).to.equal(nonce)
    })

    it(`should get address`, () => {
        expect(particle.getAddress()).to.deep.equal(address)
    })

    it(`should get token reference`, () => {
        expect(particle.getTokenDefinitionReference().equals(tokenReference)).to.equal(true)
    })
})
