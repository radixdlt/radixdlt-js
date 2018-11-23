import { expect } from 'chai'
import 'mocha'
import {  RadixFungibleType, RadixTokenClassReference, RadixAddress, RadixTokenClassParticle, RadixTokenPermissions } from '../../RadixAtomModel'


describe('RadixTokenClassParticle', () => {

    
    {
        const address = RadixAddress.generateNew()
        const name = 'test token'
        const symbol = 'TEST'
        const description = 'very testy token'
        const permissions = {
            [RadixFungibleType.MINT]: RadixTokenPermissions.TOKEN_OWNER_ONLY,
            [RadixFungibleType.TRANSFER]: RadixTokenPermissions.ALL,
        }
        const icon = Buffer.from('totallyapicture')

        const particle = new RadixTokenClassParticle(address, name, symbol, description, permissions, icon)

        it(`should get addresses`, () => {
            expect(particle.getAddresses()).to.deep.equal([address])
        })
        
        it(`should get token reference`, () => {
            expect(particle.getTokenClassReference()).to.deep.equal(new RadixTokenClassReference(address, symbol))
        })
    }

    
})
