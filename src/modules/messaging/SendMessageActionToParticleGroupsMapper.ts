import SendMessageAction, { extractDecryptorsForMessage, shouldEncryptMessage } from './SendMessageAction'
import { RadixMessageParticle, RadixParticleGroup, RadixSpunParticle } from '../atommodel'
import { RadixECIES } from '../../index'

export const sendMessageActionToParticleGroup = (
    messageAction: SendMessageAction,
): RadixParticleGroup => {

    const spunParticles: RadixSpunParticle[] = []
    const dataAndEncryptorIfAvailable = encryptDataIfNeeded(messageAction)

    if (dataAndEncryptorIfAvailable.encryptorParticle) {
        spunParticles.push(dataAndEncryptorIfAvailable.encryptorParticle)
    }

    const messageParticle = new RadixMessageParticle(
        messageAction.from,
        messageAction.to,
        dataAndEncryptorIfAvailable.data,
        { application: 'message' },
    )

    spunParticles.push(
        RadixSpunParticle.up(messageParticle),
    )

    return new RadixParticleGroup(spunParticles)
}

const encryptDataIfNeeded = (
    sendMessageAction: SendMessageAction,
): { data: Buffer, encryptorParticle?: RadixSpunParticle } => {

    if (shouldEncryptMessage(sendMessageAction)) {

        const decryptors = extractDecryptorsForMessage(sendMessageAction)
        const decryptorPublicKeys = decryptors.map(a => a.getPublic())

        const { protectors, ciphertext } = RadixECIES.encryptForMultiple(
            decryptorPublicKeys,
            sendMessageAction.payload,
        )

        const encryptorParticle = new RadixMessageParticle(
            sendMessageAction.from,
            sendMessageAction.to,
            JSON.stringify(protectors.map(p => p.toString('base64'))),
            {
                application: 'encryptor',
                contentType: 'application/json',
            },
        )

        return { data: ciphertext, encryptorParticle: RadixSpunParticle.up(encryptorParticle) }
    } else {
        return { data: sendMessageAction.payload }
    }
}
