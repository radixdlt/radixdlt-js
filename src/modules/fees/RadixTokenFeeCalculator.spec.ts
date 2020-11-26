import 'mocha'
import { expect } from 'chai'
import { calculateFeeForAtom, milliRads } from './RadixTokenFeeCalculator'
import { RadixAtom } from '../atommodel'
import RadixTransactionBuilder from '../txbuilder/RadixTransactionBuilder'
import { RadixIdentity, RadixIdentityManager } from '../../index'
import RadixAccount from '../account/RadixAccount'

describe(`Token Fees`, function() {

    let encryptedMessageAtom: RadixAtom
    let aliceIdentity: RadixIdentity
    let alice: RadixAccount
    let bob: RadixAccount

    before(function() {
        const idManager = new RadixIdentityManager()
        aliceIdentity = idManager.generateSimpleIdentity()
        alice = aliceIdentity.account
        bob = idManager.generateSimpleIdentity().account

        encryptedMessageAtom = RadixTransactionBuilder.createPayloadAtom(
            alice,
            [bob],
            '',
            'Hey',
            true,
        ).buildAtom()

    })

    it(`calculates min fee for encrypted msg`, function() {
        const fee = calculateFeeForAtom(encryptedMessageAtom)
        expect(fee.toString(10)).to.equal(milliRads(40).toString(10))
    })

    it(`calculates correct fee for mutable token definition`, function() {

        const atom = new RadixTransactionBuilder()
            .createTokenMultiIssuance(
                alice,
                'Zelda',
                'ZELDA',
                'Best coin',
                1,
                1337,
                'http://image.com',
                'http://a.b.com',
            )
            .buildAtom()

        const fee = calculateFeeForAtom(atom)
        expect(fee.toString(10)).to.equal(milliRads(1000).toString(10))
    })

})
