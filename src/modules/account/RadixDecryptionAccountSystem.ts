/*
 * (C) Copyright 2020 Radix DLT Ltd
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the “Software”),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

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
}
