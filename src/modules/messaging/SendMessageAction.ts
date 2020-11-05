import { RadixAddress } from '../atommodel'
import { doNotEncrypt, EncryptionMode, encryptionModeDecryptableBySenderAndRecipient, extractDecryptorsFromEncryptionMode } from './EncryptionMode'
import PublicKey from '../crypto/PublicKey'

export default interface SendMessageAction {
    from: RadixAddress,
    to: RadixAddress
    payload: Buffer
    encryptionMode: EncryptionMode
}

export const unencryptedPayloadMessageAction = (
    from: RadixAddress,
    to: RadixAddress,
    payload: Buffer,
): SendMessageAction => {
    return {
        from,
        to,
        payload,
        encryptionMode: doNotEncrypt,
    }
}

export const unencryptedTextMessageAction = (
    from: RadixAddress,
    to: RadixAddress,
    text: string,
): SendMessageAction => {
    return unencryptedPayloadMessageAction(
        from,
        to,
        Buffer.from(text, 'utf8'),
    )
}

export const encryptedPayloadMessageAction = (
    from: RadixAddress,
    to: RadixAddress,
    payload: Buffer,
    encryptionMode: EncryptionMode,
): SendMessageAction => {
    return {
        from,
        to,
        payload,
        encryptionMode,
    }
}

export const encryptedTextMessageAction = (
    from: RadixAddress,
    to: RadixAddress,
    text: string,
    mode: EncryptionMode,
): SendMessageAction => {
    return encryptedPayloadMessageAction(
        from,
        to,
        Buffer.from(text, 'utf8'),
        mode,
    )
}

export const encryptedTextDecryptableBySenderAndRecipientMessageAction = (
    from: RadixAddress,
    to: RadixAddress,
    text: string,
): SendMessageAction => {
    return encryptedTextMessageAction(
        from,
        to,
        text,
        encryptionModeDecryptableBySenderAndRecipient,
    )
}

export const shouldEncryptMessage = (
    message: SendMessageAction,
): boolean => {
    switch (message.encryptionMode.tag) {
        case 'encryptionModeEncrypt':
            switch (message.encryptionMode.shouldMaybeEncrypt.tag) {
                case 'shouldNotEncrypt': return false
                case 'shouldEncryptAccordingToRule':
                    const decryptors = extractDecryptorsForMessage(message)
                    return decryptors.length > 0
            }
            return false
        case 'encryptionModeDecrypt': return false
    }
}

export const extractDecryptorsForMessage = (
    message: SendMessageAction,
): PublicKey[] => {
    return extractDecryptorsFromEncryptionMode(
        message.encryptionMode,
        message.from.publicKey,
        message.to.publicKey,
    )
}
