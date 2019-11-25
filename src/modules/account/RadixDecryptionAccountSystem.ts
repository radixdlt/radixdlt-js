import RadixAccountSystem from './RadixAccountSystem'
import RadixDecryptionProvider from '../identity/RadixDecryptionProvider'
import RadixECIES from '../crypto/RadixECIES'

import { RadixAtom, RadixAtomUpdate, RadixMessageParticle, RadixAddress } from '../atommodel'
import { logger } from '../common/RadixLogger'
import { RadixAtomObservation } from '../..';

export enum RadixDecryptionState {
    DECRYPTED = 'DECRYPTED',
    NOT_ENCRYPTED = 'NOT_ENCRYPTED',
    CANNOT_DECRYPT = 'CANNOT_DECRYPT',
}

export interface RadixDecryptedData {
    data: string,
    decryptionState: RadixDecryptionState,
    application: string,
    from: RadixAddress,
    to: RadixAddress[],
}

export class RadixDecryptionAccountSystem implements RadixAccountSystem {
    public name = 'DECRYPTION'
    public decryptionProvider: RadixDecryptionProvider

    constructor(decryptionProvider?: RadixDecryptionProvider) {
        if (decryptionProvider) {
            this.decryptionProvider = decryptionProvider
        }
    }

    public async processAtomUpdate(atomUpdate: RadixAtomObservation) {
        const atom = atomUpdate.atom
        const messageParticles = atom.getParticlesOfType(RadixMessageParticle)

        const dataParticle = messageParticles.find(p => {
            return p.getMetaData('application') !== 'encryptor'
        })

        const encryptorParticle = messageParticles.find(p => {
            return p.getMetaData('application') === 'encryptor'
        })

        if (!(dataParticle)) {
            return
        }
        

        let decryptedData: RadixDecryptedData

        if (encryptorParticle) {
            const protectors = (encryptorParticle.getData().asJSON() as string[]).map(p => Buffer.from(p, 'base64'))
            const payload = dataParticle.getData().bytes

            try {
                const decrypted = await this.decryptionProvider.decryptECIESPayloadWithProtectors(protectors, payload)
                
                decryptedData = {
                    data: decrypted.toString(),
                    decryptionState: RadixDecryptionState.DECRYPTED,
                    application: dataParticle.getMetaData('application'),
                    from: dataParticle.from,
                    to: dataParticle.getAddresses(),
                }
            } catch (error) {
                decryptedData = {
                    data: dataParticle.getData().toString(),
                    decryptionState: RadixDecryptionState.CANNOT_DECRYPT,
                    application: dataParticle.getMetaData('application'),
                    from: dataParticle.from,
                    to: dataParticle.getAddresses(),
                }
            }  
        } else {
            decryptedData = {
                data: dataParticle.getData().bytes.toString(),
                decryptionState: RadixDecryptionState.NOT_ENCRYPTED,
                application: dataParticle.getMetaData('application'),
                from: dataParticle.from,
                to: dataParticle.getAddresses(),
            }
        }

        atomUpdate.processedData.decryptedData = decryptedData
    
    }

    public getState() {}
}
