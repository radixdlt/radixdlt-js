import RadixAccountSystem from './RadixAccountSystem'
import RadixDecryptionProvider from '../identity/RadixDecryptionProvider'
import RadixECIES from '../crypto/RadixECIES'

import { RadixAtom, RadixPayloadAtom } from '../atom_model'

export default class RadixDecryptionAccountSystem
    implements RadixAccountSystem {
    public name = 'DECRYPTION'

    constructor(readonly decryptionProvider?: RadixDecryptionProvider) {}

    public async processAtom(atom: RadixAtom) {
        if (
            this.decryptionProvider &&
            atom.hasOwnProperty('encryptor') &&
            atom.hasOwnProperty('encrypted')
        ) {
            let privateKey = null

            for (const protector of (atom as RadixPayloadAtom).encryptor
                .protectors) {
                try {
                    privateKey = await this.decryptionProvider.decryptECIESPayload(
                        protector.data
                    )
                } catch (error) {
                    // Do nothing
                }
            }

            if (privateKey) {
                try {
                    const rawPayload = await RadixECIES.decrypt(
                        privateKey,
                        (atom as RadixPayloadAtom).encrypted.data,
                    )
                    atom.payload = JSON.parse(rawPayload.toString())
                } catch (error) {
                    console.error(
                        'Decrypted a protector but unable to decrypt payload',
                        atom,
                    )
                }
            } else {
                console.warn('Unable to decrypt any protectors', atom)
            }
        } else if (
            atom.hasOwnProperty('encrypted') &&
            !atom.hasOwnProperty('encryptor')
        ) {
            atom.payload = (atom as RadixPayloadAtom).encrypted.data.toString()
        }
    }
}
