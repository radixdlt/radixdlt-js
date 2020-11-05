import { expect } from 'chai'
import 'mocha'
import SendMessageAction, {
    encryptedPayloadMessageAction,
    encryptedTextDecryptableBySenderAndRecipientMessageAction,
    encryptedTextMessageAction,
    extractDecryptorsForMessage,
    shouldEncryptMessage,
    unencryptedPayloadMessageAction
} from './SendMessageAction'
import { encryptionModeDecryptableBySenderAndRecipientAndThirdParties, encryptionModeDecryptableOnlyBySpecified } from './EncryptionMode'
import { generateNewAddressWithRandomMagic } from '../atommodel/primitives/RadixAddress.spec'

describe('SendMessageAction', () => {

    const alice = generateNewAddressWithRandomMagic()
    const bob = generateNewAddressWithRandomMagic()
    const clara = generateNewAddressWithRandomMagic()
    const diana = generateNewAddressWithRandomMagic()
    const bufferDeadbeef = Buffer.from('deadbeef', 'hex')

    describe('unencryptedPayloadMessageAction', () => {
        const messageAction = unencryptedPayloadMessageAction(
            alice,
            bob,
            bufferDeadbeef,
        )

        it('should not be encrypted', () => {
            expect(shouldEncryptMessage(messageAction)).to.be.false
        })

        it(`should utf8 encode text`, () => {
            expect(messageAction.payload).to.deep.equal(bufferDeadbeef)
        })

    })

    describe('encryptedTextDecryptableBySenderAndRecipientMessageAction', () => {
        const plainText = 'Hey Bob, this is a secret!'
        const messageAction = encryptedTextDecryptableBySenderAndRecipientMessageAction(
            alice,
            bob,
            plainText,
        )

        it('should be encrypted', () => {
            expect(shouldEncryptMessage(messageAction)).to.be.true
        })

        it(`should have correct message before encryption`, () => {
            // The payload has not yet been encrypted, it will be at a later point in time.
            expect(messageAction.payload.toString('utf8')).to.equal(plainText)
        })

        describe('should have correct decryptors', () => {
            const readersAbleToDecrypt = extractDecryptorsForMessage(messageAction)

            it(`it should be decryptable by sender and that should be Alice`, () => {
                expect(messageAction.from).to.equal(alice)
                expect(readersAbleToDecrypt).to.contain(alice.publicKey)
            })

            it(`it should be decryptable by recipient and that should be Bob`, () => {
                expect(messageAction.to).to.equal(bob)
                expect(readersAbleToDecrypt).to.contain(bob.publicKey)
            })

            it(`it shouldn't be decryptable by third party Clara`, () => {
                expect(readersAbleToDecrypt).to.not.contain(clara.publicKey)
            })
        })

    })


    describe('encryptedTextMessageAction with encryptionModeDecryptableOnlyBySpecified([clara]) encryption mode', () => {
        const plainText = 'Hey Bob, this is a secret!'
        const messageAction = encryptedTextMessageAction(
            alice,
            bob,
            plainText,
            encryptionModeDecryptableOnlyBySpecified([clara.publicKey]),
        )

        it('should be encrypted', () => {
            expect(shouldEncryptMessage(messageAction)).to.be.true
        })

        it(`should have correct message before encryption`, () => {
            // The payload has not yet been encrypted, it will be at a later point in time.
            expect(messageAction.payload.toString('utf8')).to.equal(plainText)
        })

        describe('should have correct decryptors', () => {
            const readersAbleToDecrypt = extractDecryptorsForMessage(messageAction)

            it(`it should only be decryptable by Clara and not even Alice (sender) nor Bob (recipient)`, () => {
                expect(readersAbleToDecrypt).to.deep.equal([clara.publicKey])
            })
        })

    })

    describe('encryptedPayloadMessageAction with encryptionModeDecryptableBySenderAndRecipientAndThirdParties([clara]) encryption mode', () => {
        const messageAction = encryptedPayloadMessageAction(
            alice,
            bob,
            bufferDeadbeef,
            encryptionModeDecryptableBySenderAndRecipientAndThirdParties([clara.publicKey]),
        )

        it('should be encrypted', () => {
            expect(shouldEncryptMessage(messageAction)).to.be.true
        })

        it(`should utf8 encode text`, () => {
            // The payload has not yet been encrypted, it will be at a later point in time.
            expect(messageAction.payload).to.deep.equal(bufferDeadbeef)
        })

        describe('should have correct decryptors', () => {
            const readersAbleToDecrypt = extractDecryptorsForMessage(messageAction)

            it(`it should be decryptable by Alice (sender), Bob (recipient) and third party Clara, but not Diana`, () => {
                expect(readersAbleToDecrypt).to.have.members([alice, bob, clara].map(a => a.publicKey))
                expect(readersAbleToDecrypt).to.not.have.members([diana.publicKey])
            })
        })

    })


})
