import { EncryptionModeEncrypt } from './encryption-mode-encrypt/EncryptionModeEncrypt'
import { EncryptionModeDecrypt } from './encryption-mode-encrypt/EncryptionModeDecrypt'
import { encryptContextPlainText } from './encryption-mode-encrypt/encrypt-context/EncryptContext'

export type EncryptionMode = EncryptionModeEncrypt | EncryptionModeDecrypt

export const doNotEncryptMessage: EncryptionMode = {
    __tag: 'encryptionModeEncrypt',
    encryptContext: encryptContextPlainText,
}

export const encryptMessage: EncryptionMode = {
    __tag: 'encryptionModeEncrypt',
    encryptContext: encryptContextPlainText,
}

