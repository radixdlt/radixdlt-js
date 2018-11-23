import { expect } from 'chai'
import 'mocha'
import {  RadixTimestampParticle, RadixOwnedTokensParticle, RadixFungibleType, RadixTokenClassReference, RadixAddress } from '../../RadixAtomModel'


describe('RadixOwnedTokensParticle', () => {

    
    {
        const amount = 123
        const type = RadixFungibleType.MINT
        const address = RadixAddress.generateNew()
        const nonce = 456
        const tokenReference = new RadixTokenClassReference(address, 'TEST')
        const planck = 789

        const particle = new RadixOwnedTokensParticle(amount, type, address, 456, tokenReference, planck)

        it(`should get type`, () => {
            expect(particle.getType()).to.equal(type)
        })
        it(`should get nonce`, () => {
            expect(particle.getNonce()).to.equal(nonce)
        })
        it(`should get planck`, () => {
            expect(particle.getPlanck()).to.equal(planck)
        })
        it(`should get address`, () => {
            expect(particle.getAddress()).to.deep.equal(address)
        })
        it(`should get token reference`, () => {
            expect(particle.getTokenClassReference()).to.deep.equal(tokenReference)
        })
    }

    
})
