import { RadixAddress } from '../atommodel'
import { doNotEncryptMessage, EncryptionMode } from './encryption-mode/EncryptionMode'
import { EncryptContextShouldEncryptBuilder } from './encryption-mode/encryption-mode-encrypt/encrypt-context/encrypt-context-should-encrypt/EncryptContextShouldEncrypt'

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
        from: from,
        to: to,
        payload: payload,
        encryptionMode: doNotEncryptMessage,
    }
}

export const unencryptedTextMessageAction = (
    from: RadixAddress,
    to: RadixAddress,
    text: string,
): SendMessageAction => {
    return unencryptedPayloadMessageAction(from, to, Buffer.from(text, 'utf8'))
}

export const encryptedPayloadMessageAction = (
    from: RadixAddress,
    to: RadixAddress,
    payload: Buffer,
    encryptBuilder: EncryptContextShouldEncryptBuilder,
): SendMessageAction => {
    return {
        from: from,
        to: to,
        payload: payload,
        encryptionMode: encryptionMode,
    }
}

export const encryptionModeWithBuilder = (encryptContextShouldEncryptBuilder: EncryptContextShouldEncryptBuilder): EncryptionMode => {
    return {

    }
}


export const encryptedTextMessageAction = (
    from: RadixAddress,
    to: RadixAddress,
    text: string,
    mode: EncryptContextShouldEncryptBuilder,
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
        decryptableOnlyBySpecifiedRecipients([from, to]),
    )
}

export const shouldEncryptMessage = (
    message: SendMessageAction,
): boolean => {
    return !!message.encryptionMode
}

export const extractDecryptorsForMessage = (
    message: SendMessageAction,
): RadixAddress[] => {
    return extractDecryptorsFromEncryptionMode(
        message.encryptionMode,
        message.from,
        message.to
    )
}
