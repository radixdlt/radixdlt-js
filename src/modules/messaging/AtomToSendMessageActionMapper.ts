import { RadixAddress, RadixAtom, RadixMessageParticle, RadixParticleGroup, RadixSpin } from '../atommodel'
import RadixDecryptionProvider from '../identity/RadixDecryptionProvider'
import SendMessageAction from './SendMessageAction'
import { logger } from '../..'
import {
    decryptionFailedErrorWhileDecrypting,
    decryptionKeyNotPresent,
    decryptionSuccessful,
    EncryptionMode,
    wasNotEncrypted
} from './EncryptionMode'
import DecryptionError from '../crypto/DecryptionError'

export const mapAtomToSendMessagesAction = async (
    atom: RadixAtom,
    decryptionProvider?: RadixDecryptionProvider,
): Promise<SendMessageAction[]> => {
    if (!atom.containsParticle(RadixMessageParticle)) {
        return []
    }
    const particleGroupsWithMessageParticles = atom.particleGroups.filter(pg => pg.containsParticle(RadixMessageParticle))

    const encryptedContexts = particleGroupsWithMessageParticles
        .map(pg => encryptedMessageContextFromMessageParticles(
            pg.getParticlesOfType(RadixMessageParticle, RadixSpin.UP),
            ),
        )


    // return encryptedContexts.map(ec => decryptMessageIfNeededAndAble(ec, decryptionProvider))
    const messageActions: SendMessageAction[] = []
    for (const encryptedContext of encryptedContexts) {
        // decryptMessageIfNeededAndAble(ec, decryptionProvider).then(msg => {
        //     messageActions.push(msg)
        // }).catch(error => {
        //     throw new Error(`Incorrect implementation, should never have thrown an error
        //      while decrypting message, if we failed to decrypt the message
        //       we should be using 'ErrorWhileDecrypting' as value for 'encryptionMode' on the Message,
        //       and let the payload of the message be the still encrypted data.`)
        // })
        messageActions.push(
            await decryptMessageIfNeededAndAble(
                encryptedContext,
                decryptionProvider,
            ),
        )
    }
    return messageActions
}

interface EncryptedPrivateKey {
    buffer: Buffer
}

/// Holder of an array of EncryptedPrivateKey's, called `protectors`.
///
/// These `protectors` have been created by encrypting the privatekey of a temporary "shared key",
/// using the public key of the `readers`, those being able to decrypt some encrypted message.
///
interface Encryptor {
    protectors: [EncryptedPrivateKey]
}

const encryptorFromData = (encryptorParticle: RadixMessageParticle): Encryptor => {

    const applicationValue = encryptorParticle.metaData.application
    if (applicationValue !== 'encryptor') {
        throw new Error(`⚠️ Application layer discrepancy, 
            got message particle without any metadata with 
            key-value: '${applicationValue}', but proceeding anyway
            `)
    }

    const protectorsJSONString = encryptorParticle.bytes.bytes.toString('utf8')
    const protectorsPublicKeysAsBuffer = JSON.parse(protectorsJSONString)

    const encryptor: Encryptor = {
        protectors: protectorsPublicKeysAsBuffer.map((keyBuffer: Buffer): EncryptedPrivateKey => {
            return {
                buffer: keyBuffer,
            }
        }),
    }

    return encryptor
}

interface MessageContextWasNotEncrypted {
    tag: 'messageContextWasNotEncrypted'
    buffer: Buffer
}
const makeEncryptedMessageContextPayloadNotEncrypted = (buffer: Buffer): EncryptedMessageContextPayload => {
    return {
        tag: 'messageContextWasNotEncrypted',
        buffer,
    }
}
interface MessageContextEncrypted {
    tag: 'messageContextEncrypted'
    buffer: Buffer,
    encryptedBy: Encryptor
}
const makeEncryptedMessageContextPayloadEncrypted = (
    buffer: Buffer,
    encryptedBy: Encryptor,
): EncryptedMessageContextPayload => {
    return {
        tag: 'messageContextEncrypted',
        buffer,
        encryptedBy,
    }
}
type EncryptedMessageContextPayload = MessageContextWasNotEncrypted | MessageContextEncrypted

interface EncryptedMessageContext {
    sender: RadixAddress,
    recipient: RadixAddress,
    payload: EncryptedMessageContextPayload
}

const encryptedMessageContextFromMessageParticle = (
    messageParticle: RadixMessageParticle,
    encryptorParticle?: RadixMessageParticle,
): EncryptedMessageContext => {

    let payload: EncryptedMessageContextPayload
    if (encryptorParticle) {
        const encryptor = encryptorFromData(encryptorParticle)

        payload = makeEncryptedMessageContextPayloadEncrypted(
            messageParticle.bytes.bytes,
            encryptor,
        )
    } else {
        payload = makeEncryptedMessageContextPayloadNotEncrypted(messageParticle.bytes.bytes)
    }
    return {
        sender: messageParticle.from,
        recipient: messageParticle.to,
        payload,
    }
}

const firstMessageParticleWhereMetadataApplicationEquals = (
    application: string,
    fromParticles: RadixMessageParticle[],
): RadixMessageParticle | undefined => {
    return fromParticles.find(p => p.metaData.application === application)
}

const encryptedMessageContextFromMessageParticles = (
    messageParticles: RadixMessageParticle[],
): EncryptedMessageContext => {
    if (messageParticles.length === 0) {
        throw new Error(`Should not be empty`)
    }
    if (messageParticles.length === 1) {
        const messageParticle = messageParticles[0]
        const applicationValue = messageParticle.metaData.application
        if (applicationValue !== 'message') {
            logger.warn(`⚠️ Application layer discrepancy, 
            got message particle without any metadata with 
            key-value: '${applicationValue}', but proceeding anyway
            `)
        }
        return encryptedMessageContextFromMessageParticle(messageParticle)
    } else if (messageParticles.length === 2) {
        const particleMetaDataMessage = firstMessageParticleWhereMetadataApplicationEquals(
            'message',
            messageParticles,
        )
        const particleMetaDataEncryptor = firstMessageParticleWhereMetadataApplicationEquals(
            'encryptor',
            messageParticles,
        )
        if (!particleMetaDataMessage || !particleMetaDataEncryptor) {
            throw new Error(`Expected exactly one MessageParticle with metaData['application'] === 'message'
            and exactly one MessageParticle with metaData['application'] === 'encryptor' in the same
            ParticleGroup, but got particle group with messageParticles: ${JSON.stringify(messageParticles)}`)
        }

        return encryptedMessageContextFromMessageParticle(
            particleMetaDataMessage,
            particleMetaDataEncryptor,
        )
    } else {
        throw new Error(`Unexpectedly got more than 2 message particles in same ParticleGroup, this is probably a bad state?`)
    }
}

const decryptMessageIfNeededAndAble = async (
    encryptedMessageContext: EncryptedMessageContext,
    decryptionProvider?: RadixDecryptionProvider,
): Promise<SendMessageAction> => {
    switch (encryptedMessageContext.payload.tag) {
        case 'messageContextEncrypted':
            if (!decryptionProvider) {
                return {
                    from: encryptedMessageContext.sender,
                    to: encryptedMessageContext.recipient,
                    payload: encryptedMessageContext.payload.buffer,
                    encryptionMode: decryptionKeyNotPresent,
                }
            } else {

                const encryptedData = encryptedMessageContext.payload.buffer

                decryptionProvider.decryptECIESPayloadWithProtectors(
                    encryptedMessageContext.payload.encryptedBy.protectors.map(p => p.buffer),
                    encryptedData,
                ).then(decrypted => {
                    return {
                        from: encryptedMessageContext.sender,
                        to: encryptedMessageContext.recipient,
                        payload: decrypted,
                        encryptionMode: decryptionSuccessful,
                    }
                }).catch(decryptionError => {
                    if (decryptionError instanceof DecryptionError) {
                        return {
                            from: encryptedMessageContext.sender,
                            to: encryptedMessageContext.recipient,
                            payload: encryptedData,
                            encryptionMode: decryptionFailedErrorWhileDecrypting(
                                decryptionError,
                            ),
                        }
                    } else {
                        throw new Error(`MetaError - expected Error of type 'DecryptionError' but got: '${typeof decryptionError}',
                         failure while decrypting, failed with error: '${decryptionError}'`)
                    }
                })


            }
        case 'messageContextWasNotEncrypted':
            return {
                from: encryptedMessageContext.sender,
                to: encryptedMessageContext.recipient,
                payload: encryptedMessageContext.payload.buffer,
                encryptionMode: wasNotEncrypted,
            }
    }
}
