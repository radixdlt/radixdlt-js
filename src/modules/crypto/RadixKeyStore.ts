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

import crypto from 'crypto'
import { radixHash } from '../common/RadixUtil'
import { RadixSimpleIdentity, RadixAddress } from '../..'


interface KeystoreData {
    crypto: {
        cipher: string,
        cipherparams: {
            iv: string,
        },
        ciphertext: string,
        pbkdfparams: {
            iterations: number,
            keylen: number,
            digest: string,
            salt: string,
        },
        mac: string,
    },
    id: string,
}

export default class RadixKeyStore {

    /**
     * Encrypt a simple identity
     * @param identity 
     * @param password 
     * @returns  
     */
    public static encryptSimpleIdentity(identity: RadixSimpleIdentity, password: string): Promise<KeystoreData> {
        const privateKey = identity.address.keyPair.getPrivate('hex')
        const id = identity.address.getUID().toString()
        
        return this.encryptData(privateKey, id, password)
    }

    public static encryptData(data: string, id: string, password: string): Promise<KeystoreData> {
        return new Promise((resolve, reject) => {

            // Derrive key
            const salt = crypto.randomBytes(32).toString('hex')
            const iterations = 100000
            const keylen = 32
            const digest = 'sha512'

            crypto.pbkdf2(
                password,
                salt,
                iterations,
                keylen,
                digest,
                (error, derivedKey) => {
                    if (error) {
                        reject(error)
                    }

                    // Encrypt private keys with derrived key
                    const algorithm = 'aes-256-ctr'
                    const iv = crypto.randomBytes(16)
                    const cipher = crypto.createCipheriv(
                        algorithm,
                        derivedKey,
                        iv,
                    )

                    const ciphertext = Buffer.concat([
                        cipher.update(data),
                        cipher.final(),
                    ])

                    // Compute MAC
                    const mac = this.calculateMac(derivedKey, ciphertext)

                    const keystoreData: KeystoreData = {
                        crypto: {
                            cipher: algorithm,
                            cipherparams: {
                                iv: iv.toString('hex'),
                            },
                            ciphertext: ciphertext.toString('hex'),
                            pbkdfparams: {
                                iterations,
                                keylen,
                                digest,
                                salt,
                            },
                            mac: mac.toString('hex'),
                        },
                        id,
                    }

                    resolve(keystoreData)
                },
            )
        })
    }

    /**
     * Decrypts an encrypted private key
     * @param keystoreData 
     * @param password 
     * @returns key 
     */
    public static decryptSimpleIdentity(keystoreData: KeystoreData, password: string): Promise<RadixSimpleIdentity> {
        return this.decryptKeystore(keystoreData, password)
        .then((data) => {
            return new RadixSimpleIdentity(RadixAddress.fromPrivate(data))
        })
    }

    public static decryptKeystore(keystoreData: KeystoreData, password: string) {
        return new Promise<string>((resolve, reject) => {
            // Derrive key
            const salt = keystoreData.crypto.pbkdfparams.salt
            const iterations = keystoreData.crypto.pbkdfparams.iterations
            const keylen = keystoreData.crypto.pbkdfparams.keylen
            const digest = keystoreData.crypto.pbkdfparams.digest

            crypto.pbkdf2(
                password,
                salt,
                iterations,
                keylen,
                digest,
                (error, derivedKey) => {
                    if (error) {
                        return reject(error)
                    }

                    // Decrypt ciphertext
                    const algorithm = keystoreData.crypto.cipher
                    const iv = Buffer.from(
                        keystoreData.crypto.cipherparams.iv,
                        'hex',
                    )
                    const ciphertext = Buffer.from(
                        keystoreData.crypto.ciphertext,
                        'hex',
                    )

                    // Check MAC
                    const MAC = Buffer.from(keystoreData.crypto.mac, 'hex')
                    const computedMAC = this.calculateMac(
                        derivedKey,
                        ciphertext,
                    )

                    if (!computedMAC.equals(MAC)) {
                        return reject('MAC mismatch')
                    }

                    const decipher = crypto.createDecipheriv(
                        algorithm,
                        derivedKey,
                        iv,
                    )

                    const data = Buffer.concat([
                        decipher.update(ciphertext),
                        decipher.final(),
                    ]).toString()

                    return resolve(data)
                },
            )
        })
    }


    private static calculateMac(derivedKey: Buffer, ciphertext: Buffer) {
        const dataToMac = Buffer.concat([derivedKey, ciphertext])
        return radixHash(dataToMac)
    }
}
