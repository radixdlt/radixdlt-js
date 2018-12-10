import RadixAccountSystem from './RadixAccountSystem'
import RadixDecryptionProvider from '../identity/RadixDecryptionProvider'
import RadixECIES from '../crypto/RadixECIES'

import { RadixAtom, RadixAtomUpdate, RadixMessageParticle, RadixAddress } from '../atommodel'
import { logger } from '../common/RadixLogger'

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

    public async processAtomUpdate(atomUpdate: RadixAtomUpdate) {
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
            const protectors = encryptorParticle.getData().asJSON() as string[]
            
            let decrypted
            for (const protector of protectors) {
                let privateKey

                try {
                    privateKey = await this.decryptionProvider.decryptECIESPayload(Buffer.from(protector, 'base64'))
                } catch (error) {
                    // Do nothing
                }

                if (privateKey) {
                    try {
                        const rawPayload = await RadixECIES.decrypt(privateKey, dataParticle.getData().bytes)
                        
                        decrypted = rawPayload.toString()
                    } catch (error) {
                        logger.error('Decrypted a protector but unable to decrypt payload', atom)
                    }
                } 
            }

            if (decrypted) {
                decryptedData = {
                    data: decrypted,
                    decryptionState: RadixDecryptionState.DECRYPTED,
                    application: dataParticle.getMetaData('application'),
                    from: dataParticle.from,
                    to: dataParticle.getAddresses(),
                }
            } else {
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
}
