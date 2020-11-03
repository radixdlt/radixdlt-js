import { EncryptContext } from './encrypt-context/EncryptContext'
import {
    EncryptContextShouldEncrypt,
    EncryptContextShouldEncryptBuilder
} from './encrypt-context/encrypt-context-should-encrypt/EncryptContextShouldEncrypt'

export interface EncryptionModeEncrypt {
    __tag: 'encryptionModeEncrypt'
    encryptContext: EncryptContext
}

export const encryptionModeEncryptWithContext = (encryptContext: EncryptContext): EncryptionModeEncrypt => {
    return {
        __tag: 'encryptionModeEncrypt',
        encryptContext,
    }
}

export const encryptionModeEncryptWithShouldEncrypt = (shouldEncryptBuilder: EncryptContextShouldEncryptBuilder): EncryptionModeEncrypt => {
    return {
        __tag: 'encryptContextShouldEncrypt',
        encryptContextShouldEncryptBuilder: shouldEncryptBuilder,
    }
}
