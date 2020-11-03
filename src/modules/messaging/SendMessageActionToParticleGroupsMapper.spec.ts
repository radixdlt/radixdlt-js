import { expect } from 'chai'
import 'mocha'
import { RadixAddress, RadixBytes, RadixMessageParticle, RadixSpin, RadixSpunParticle } from '../atommodel'
import {
    encryptedTextDecryptableBySenderAndRecipientMessageAction, extractDecryptorsForMessage,
    unencryptedTextMessageAction
} from './SendMessageAction'
import { sendMessageActionToParticleGroup } from './SendMessageActionToParticleGroupsMapper'

describe('SendMessageActionToParticleGroupsMapper', () => {

    const alice = RadixAddress.generateNew()
    const bob = RadixAddress.generateNew()

    const plainTextMessage = 'Hey Bob (and World!) this is Alice'

    const messageActionAliceToBobUnencrypted = unencryptedTextMessageAction(
        alice,
        bob,
        plainTextMessage,
    )

    const secretMessage = 'Hey Bob this is a super secret message'
    const messageActionAliceToBobEncrypted = encryptedTextDecryptableBySenderAndRecipientMessageAction(
        alice,
        bob,
        secretMessage,
    )

    const assertMessageParticle = (spunParticle: RadixSpunParticle, assertPayload: (payload: RadixBytes) => void): void => {
        expect(spunParticle.spin).to.equal(RadixSpin.UP)
        expect(spunParticle.particle).to.be.instanceof(RadixMessageParticle)
        const messageParticle: RadixMessageParticle = spunParticle.particle as RadixMessageParticle
        expect(messageParticle.from).to.equal(alice)
        expect(messageParticle.to).to.equal(bob)
        expect(messageParticle.metaData).to.deep.equal({application: 'message'})

        assertPayload(messageParticle.bytes)
    }

    it(`should only create a single particle when not encrypted`, () => {
        const particleGroup = sendMessageActionToParticleGroup(
            messageActionAliceToBobUnencrypted,
        )
        expect(particleGroup.particles.length).to.equal(1)
        const spunParticle = particleGroup.particles[0]
        assertMessageParticle(spunParticle, (payload) => {
            expect(payload.bytes.toString('utf8')).to.equal(plainTextMessage)
        })

    })

    it(`should create two particle when encrypted`, () => {
        const messageAction = messageActionAliceToBobEncrypted
        const particleGroup = sendMessageActionToParticleGroup(
            messageAction,
        )
        const protectorsFromMessage = extractDecryptorsForMessage(messageAction)

        expect(particleGroup.particles.length).to.equal(2)

        const encryptorSpunParticle = particleGroup.particles[0]

        expect(encryptorSpunParticle.spin).to.equal(RadixSpin.UP)
        expect(encryptorSpunParticle.particle).to.be.instanceof(RadixMessageParticle)
        const encryptorParticle: RadixMessageParticle = encryptorSpunParticle.particle as RadixMessageParticle
        expect(encryptorParticle.metaData).to.deep.equal({ application: 'encryptor', contentType: 'application/json'})
        const protectorsJSONString = encryptorParticle.bytes.bytes.toString('utf8')
        const protectorsPublicKeysAsBuffer: Buffer[] = JSON.parse(protectorsJSONString)
        expect(protectorsPublicKeysAsBuffer.length).to.equal(protectorsFromMessage.length)

        const messageSpunParticle = particleGroup.particles[1]

        assertMessageParticle(messageSpunParticle, (payload) => {
            expect(payload.bytes).to.not.deep.equal(Buffer.from(secretMessage, 'utf8'),
                'The payload of the message particle should not equal utf8 encoding of the message text, because it is encrypted...',
            )
        })

    })

})
