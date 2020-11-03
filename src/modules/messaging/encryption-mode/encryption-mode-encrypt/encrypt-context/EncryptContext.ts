import { EncryptContextShouldEncrypt } from './encrypt-context-should-encrypt/EncryptContextShouldEncrypt'

export interface EncryptContextPlainText {
    __tag: 'encryptContextPlainText'
}

export const encryptContextPlainText: EncryptContext = {
    __tag: 'encryptContextPlainText',
}

export type EncryptContext = EncryptContextShouldEncrypt | EncryptContextPlainText
