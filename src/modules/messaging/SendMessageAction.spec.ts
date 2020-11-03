import { expect } from 'chai'
import 'mocha'
import { RadixAddress } from '../atommodel'
import SendMessageAction, {
    encryptedPayloadMessageAction,
    shouldEncryptMessage,
    unencryptedPayloadMessageAction,
    unencryptedTextMessageAction
} from './SendMessageAction'
import {
    decryptableBySenderAndRecipient,
    decryptableBySenderAndRecipientAndSpecifiedThirdParties,
    decryptableOnlyBySpecifiedRecipients,
    extractDecryptorsForMessage
} from './encryption-mode/encryption-mode-encrypt/encrypt-context/encrypt-context-should-encrypt/EncryptContextShouldEncryptBuilder'

describe('SendMessageAction', () => {

    const alice = RadixAddress.generateNew()
    const bob = RadixAddress.generateNew()
    const clara = RadixAddress.generateNew()
    const diana = RadixAddress.generateNew()
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

    describe('encryptedPayloadMessageAction with decryptableBySenderAndRecipient encryption mode', () => {
        const messageAction = encryptedPayloadMessageAction(
            alice,
            bob,
            bufferDeadbeef,
            decryptableBySenderAndRecipient,
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

            it(`it should be decryptable by sender and that should be Alice`, () => {
                expect(messageAction.from).to.equal(alice)
                expect(readersAbleToDecrypt).to.contain(alice)
            })

            it(`it should be decryptable by recipient and that should be Bob`, () => {
                expect(messageAction.to).to.equal(bob)
                expect(readersAbleToDecrypt).to.contain(bob)
            })

            it(`it shouldn't be decryptable by third party Clara`, () => {
                expect(readersAbleToDecrypt).to.not.contain(clara)
            })
        })

    })


    describe('encryptedPayloadMessageAction with decryptableOnlyBySpecifiedRecipients([clara]) encryption mode', () => {
        const messageAction = encryptedPayloadMessageAction(
            alice,
            bob,
            bufferDeadbeef,
            decryptableOnlyBySpecifiedRecipients([clara]),
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

            it(`it should only be decryptable by Clara and not even Alice (sender) nor Bob (recipient)`, () => {
                expect(readersAbleToDecrypt).to.deep.equal([clara])
            })
        })

    })

    describe('encryptedPayloadMessageAction with decryptableBySenderAndRecipientAndSpecifiedThirdParties([clara]) encryption mode', () => {
        const messageAction = encryptedPayloadMessageAction(
            alice,
            bob,
            bufferDeadbeef,
            decryptableBySenderAndRecipientAndSpecifiedThirdParties([clara]),
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
                expect(readersAbleToDecrypt).to.have.members([alice, bob, clara])
                expect(readersAbleToDecrypt).to.not.have.members([diana])
            })
        })

    })


})
