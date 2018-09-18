import RadixAccountSystem from './RadixAccountSystem';
import RadixDecryptionProvider from '../identity/RadixDecryptionProvider';
import RadixAtom from '../atom/RadixAtom';
import RadixPayloadAtom from '../atom/RadixPayloadAtom';
import RadixECIES from '../crypto/RadixECIES';

export default class RadixDecryptionAccountSystem implements RadixAccountSystem {
    public name = 'DECRYPTION'

    
    constructor(readonly decryptionProvider?: RadixDecryptionProvider) {
        //
    }
    
    
    public async processAtom(atom: RadixAtom) {
        if (this.decryptionProvider && atom.hasOwnProperty('encryptor') && atom.hasOwnProperty('encrypted')) {
            let privateKey = null

            for (const protector of (atom as RadixPayloadAtom).encryptor.protectors) {
                try {
                    privateKey = this.decryptionProvider.decryptECIESPayload(protector.data)
                } catch (error) {
                    //
                }
            }


            if (privateKey) {
                const rawPayload = RadixECIES.decrypt(privateKey, (atom as RadixPayloadAtom).encrypted.data)
                atom.payload = JSON.parse(rawPayload.toString())
            }
            
        } else if (atom.hasOwnProperty('encrypted') && !atom.hasOwnProperty('encryptor')) {
            atom.payload = (atom as RadixPayloadAtom).encrypted.data.toString()
        }
    }
}
