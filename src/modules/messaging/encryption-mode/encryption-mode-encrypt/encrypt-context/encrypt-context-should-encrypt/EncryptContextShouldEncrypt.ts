import { RadixAddress } from '../../../../../atommodel'

export interface EncryptContextShouldEncrypt {
    __tag: 'encryptContextShouldEncrypt'
    encryptContextShouldEncryptBuilder: EncryptContextShouldEncryptBuilder
}

export interface DecryptableBySenderAndRecipient {
    __tag: 'decryptableBySenderAndRecipient'
}

export interface DecryptableOnlyBySpecifiedRecipients {
    __tag: 'decryptableOnlyBySpecifiedRecipients'
    onlyRecipientsWhoCanDecrypt: RadixAddress[]
}
export interface DecryptableBySenderAndRecipientAndSpecifiedThirdParties {
    __tag: 'decryptableBySenderAndRecipientAndSpecifiedThirdParties'
    // Apart from sender and recipient, these third parties can decrypt the message
    thirdParties: RadixAddress[]
}

export type EncryptContextShouldEncryptBuilder = DecryptableBySenderAndRecipient |
    DecryptableOnlyBySpecifiedRecipients |
    DecryptableBySenderAndRecipientAndSpecifiedThirdParties

export const decryptableBySenderAndRecipient: EncryptContextShouldEncryptBuilder = {
    __tag: 'decryptableBySenderAndRecipient',
}

export const decryptableOnlyBySpecifiedRecipients = (onlyRecipientsWhoCanDecrypt: RadixAddress[]): EncryptContextShouldEncryptBuilder => {
    return {
        __tag: 'decryptableOnlyBySpecifiedRecipients',
        onlyRecipientsWhoCanDecrypt,
    }
}

export const decryptableBySenderAndRecipientAndSpecifiedThirdParties = (thirdParties: RadixAddress[]): EncryptContextShouldEncryptBuilder => {
    return {
        __tag: 'decryptableBySenderAndRecipientAndSpecifiedThirdParties',
        thirdParties,
    }
}

export const extractDecryptorsFromEncryptContextShouldEncryptBuilder = (
    encryptionMode: EncryptContextShouldEncryptBuilder,
    senderOfMessage: RadixAddress,
    recipientOfMessage: RadixAddress,
): RadixAddress[] => {
    switch (encryptionMode.__tag) {
        case 'decryptableBySenderAndRecipient':
            return [senderOfMessage, recipientOfMessage]
        case 'decryptableBySenderAndRecipientAndSpecifiedThirdParties':
            return [senderOfMessage, recipientOfMessage].concat(encryptionMode.thirdParties)
        case 'decryptableOnlyBySpecifiedRecipients':
            return encryptionMode.onlyRecipientsWhoCanDecrypt
    }
}
