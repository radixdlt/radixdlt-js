import RadixAccountSystem from './RadixAccountSystem'
import RadixDecryptionProvider from '../identity/RadixDecryptionProvider'
import RadixECIES from '../crypto/RadixECIES'

import { RadixAtom, RadixPayloadAtom, RadixAtomUpdate } from '../RadixAtomModel'
import { logger } from '../common/RadixLogger'

export default class RadixDecryptionAccountSystem implements RadixAccountSystem {
    public name = 'DECRYPTION'
    public decryptionProvider

    constructor(decryptionProvider?: RadixDecryptionProvider) {
        if (decryptionProvider) {
            this.decryptionProvider = decryptionProvider
        }
    }

    public async processAtomUpdate(atomUpdate: RadixAtomUpdate) {
        const atom = atomUpdate.atom

        if (this.decryptionProvider && atom.hasOwnProperty('encryptor') && atom.hasOwnProperty('encrypted')) {
            let privateKey = null

            for (const protector of (atom as RadixPayloadAtom).encryptor.protectors) {
                try {
                    privateKey = await this.decryptionProvider.decryptECIESPayload(protector.data)
                } catch (error) {
                    // Do nothing
                }
            }

            if (privateKey) {
                try {
                    const rawPayload = await RadixECIES.decrypt(privateKey, (atom as RadixPayloadAtom).encrypted.data)
                    
                    atom.payload = rawPayload.toString()
                } catch (error) {
                    logger.error('Decrypted a protector but unable to decrypt payload', atom)
                }
            } else {
                logger.trace('Unable to decrypt any protectors', atom)
            }
        } else if (atom.hasOwnProperty('encrypted') && !atom.hasOwnProperty('encryptor')) {
            atom.payload = (atom as RadixPayloadAtom).encrypted.data.toString()
        }
    }
}
