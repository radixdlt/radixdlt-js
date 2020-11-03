import { DecryptedContext } from './decrypt-context/DecryptedContext'

export interface EncryptionModeDecrypt {
    __tag: 'encryptionModeDecrypt'
    decryptContext: DecryptedContext
}
