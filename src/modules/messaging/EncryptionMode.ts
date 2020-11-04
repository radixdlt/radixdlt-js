import DecryptionError from '../crypto/DecryptionError'
import PublicKey from '../crypto/PublicKey'

interface ShouldEncryptRule {
    isDecryptableBySender: boolean,
    isDecryptableByRecipient: boolean,
    decryptableByThirdParties: PublicKey[],
}

interface ShouldNotEncrypt {
    tag: 'shouldNotEncrypt',
}

interface ShouldEncryptAccordingToRule {
    tag: 'shouldEncryptAccordingToRule',
    shouldEncryptRule: ShouldEncryptRule
}
type ShouldMaybeEncrypt = ShouldNotEncrypt | ShouldEncryptAccordingToRule

interface EncryptionModeEncrypt {
    tag: 'encryptionModeEncrypt',
    shouldMaybeEncrypt: ShouldMaybeEncrypt
}

const buildEncryptionModeDecryptableBySenderAndRecipientAndThirdParties = (
    isDecryptableBySender: boolean,
    isDecryptableByRecipient: boolean,
    decryptableByThirdParties: PublicKey[],
): EncryptionMode => {
    return {
        tag: 'encryptionModeEncrypt',
        shouldMaybeEncrypt: {
            tag: 'shouldEncryptAccordingToRule',
            shouldEncryptRule: {
                isDecryptableBySender,
                isDecryptableByRecipient,
                decryptableByThirdParties,
            },
        },
    }
}

export const encryptionModeDecryptableBySenderAndRecipientAndThirdParties = (thirdParties: PublicKey[]): EncryptionMode => {
    return buildEncryptionModeDecryptableBySenderAndRecipientAndThirdParties(
        true,
        true,
        thirdParties,
    )
}
export const encryptionModeDecryptableOnlyBySpecified = (decryptors: PublicKey[]): EncryptionMode => {
    return buildEncryptionModeDecryptableBySenderAndRecipientAndThirdParties(
        false,
        false,
        decryptors,
    )
}
export const encryptionModeDecryptableBySenderAndRecipient: EncryptionMode = encryptionModeDecryptableBySenderAndRecipientAndThirdParties([])

export const doNotEncrypt: EncryptionMode = {
    tag: 'encryptionModeEncrypt',
    shouldMaybeEncrypt: {
        tag: 'shouldNotEncrypt',
    },
}

export const wasNotEncrypted: EncryptionMode = {
    tag: 'encryptionModeDecrypt',
    didMaybeDecrypt: {
        tag: 'wasNotEncrypted',
    },
}

interface Decrypted {
    tag: 'decrypted',
}
interface WasNotEncrypted {
    tag: 'wasNotEncrypted'
}

interface DecryptionKeyNotPresent {
    tag: 'decryptionKeyNotPresent'
}
interface ErrorWhileDecrypting {
    tag: 'errorWhileDecrypting'
    reason: DecryptionError,
}
type CannotDecrypt = ErrorWhileDecrypting | DecryptionKeyNotPresent
type DidMaybeDecrypt = Decrypted | WasNotEncrypted | CannotDecrypt

interface EncryptionModeDecrypt {
    tag: 'encryptionModeDecrypt'
    didMaybeDecrypt: DidMaybeDecrypt
}

export type EncryptionMode = EncryptionModeDecrypt | EncryptionModeEncrypt

const extractDecryptorsFromShouldEncryptAccordingToRule = (
    shouldEncryptRule: ShouldEncryptRule,
    sender: PublicKey,
    recipient: PublicKey,
): PublicKey[] => {
   const decryptors: PublicKey[] = []
    if (shouldEncryptRule.isDecryptableBySender) {
        decryptors.push(sender)
    }
    if (shouldEncryptRule.isDecryptableByRecipient) {
        decryptors.push(recipient)
    }
    return decryptors.concat(shouldEncryptRule.decryptableByThirdParties)
}

const extractDecryptorsFromShouldMaybeEncrypt = (
    shouldMaybeEncrypt: ShouldMaybeEncrypt,
    sender: PublicKey,
    recipient: PublicKey,
): PublicKey[] => {
    switch (shouldMaybeEncrypt.tag) {
        case 'shouldEncryptAccordingToRule':
            return extractDecryptorsFromShouldEncryptAccordingToRule(
                shouldMaybeEncrypt.shouldEncryptRule,
                sender,
                recipient,
            )
        case 'shouldNotEncrypt': return []
    }
}

export const extractDecryptorsFromEncryptionMode = (
    encryptionMode: EncryptionMode,
    sender: PublicKey,
    recipient: PublicKey,
): PublicKey[] => {
    switch (encryptionMode.tag) {
        case 'encryptionModeDecrypt':
            throw new Error(`EncryptionMode is EncryptionModeDecrypt`)
        case 'encryptionModeEncrypt':
            return extractDecryptorsFromShouldMaybeEncrypt(
                encryptionMode.shouldMaybeEncrypt,
                sender,
                recipient,
            )
    }
}

const makeDecryptionKeyNotPresent = (): EncryptionMode => {

    const _decryptionKeyNotPresent: DecryptionKeyNotPresent = {
        tag: 'decryptionKeyNotPresent',
    }
    const _cannotDecrypt: CannotDecrypt = _decryptionKeyNotPresent
    const _didMaybeDecrypt: DidMaybeDecrypt = _cannotDecrypt

    const _encryptionModeDecrypt: EncryptionModeDecrypt = {
        tag: 'encryptionModeDecrypt',
        didMaybeDecrypt: _didMaybeDecrypt,
    }
    return _encryptionModeDecrypt as EncryptionMode
}

export const decryptionKeyNotPresent: EncryptionMode = makeDecryptionKeyNotPresent()

const makeDecryptionSuccessful = (): EncryptionMode => {
    const _decrypted: Decrypted = {
        tag: 'decrypted',
    }
    const _didMaybeDecrypt: DidMaybeDecrypt = _decrypted
    const _encryptionModeDecrypt: EncryptionModeDecrypt = {
        tag: 'encryptionModeDecrypt',
        didMaybeDecrypt: _didMaybeDecrypt,
    }
    return _encryptionModeDecrypt as EncryptionMode
}
export const decryptionSuccessful: EncryptionMode = makeDecryptionSuccessful()

export const decryptionFailedErrorWhileDecrypting = (reason: DecryptionError): EncryptionMode => {
    const _errorWhileDecrypting: ErrorWhileDecrypting = {
        tag: 'errorWhileDecrypting',
        reason,
    }
    const _cannotDecrypt: CannotDecrypt = _errorWhileDecrypting
    const _didMaybeDecrypt: DidMaybeDecrypt = _cannotDecrypt

    const _encryptionModeDecrypt: EncryptionModeDecrypt = {
        tag: 'encryptionModeDecrypt',
        didMaybeDecrypt: _didMaybeDecrypt,
    }
    return _encryptionModeDecrypt as EncryptionMode
}
