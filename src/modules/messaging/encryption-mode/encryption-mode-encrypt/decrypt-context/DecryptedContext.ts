

// Specifies that the payload in the SentMessage object WAS originally
// encrypted and has been successfully decrypted to it's present byte array.
import DecryptionError from '../../../../crypto/DecryptionError'

export interface DecryptedContextDecrypted {
    __tag: 'decryptedContextDecrypted'
}

// Specifies that the payload in the SentMessage object was NOT
// encrypted and the present data byte array just represents the original data.
export interface DecryptedContextWasNotEncrypted {
    __tag: 'decryptedContextWasNotEncrypted'
}

export interface DecryptedContextCannotDecrypt {
    __tag: 'decryptedContextCannotDecrypt',
    reason: DecryptionError
}

export type DecryptedContext = DecryptedContextDecrypted | DecryptedContextWasNotEncrypted | DecryptedContextCannotDecrypt
