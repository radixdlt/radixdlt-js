import RadixUtil from '../common/RadixUtil'

import { RadixKeyPair } from '../atom_model'

import fs from 'fs'
import crypto from 'crypto'

export default class RadixKeyStore {


    /**
     * Store a private key to disk in an encrypted format
     * @param filePath 
     * @param keyPair 
     * @param password 
     * @returns  
     */
    public static async storeKey(
        filePath: string,
        keyPair: RadixKeyPair,
        password: string,
    ) {
        return new Promise((resolve, reject) => {
            this.encryptKey(keyPair, password).then((fileContents) => {
                // Write to file
                fs.writeFile(filePath, JSON.stringify(fileContents), (error) => {
                    if (error) { reject(error) }
                    
                    resolve(fileContents)
                })
            })
        })
    }

    /**
     * Encrypt a private key
     * @param keyPair 
     * @param password 
     * @returns  
     */
    public static encryptKey(keyPair: RadixKeyPair, password: string) {
        return new Promise((resolve, reject) => {
            const privateKey = keyPair.keyPair.getPrivate('hex')

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
                        cipher.update(privateKey),
                        cipher.final(),
                    ])

                    // Compute MAC
                    const mac = this.calculateMac(derivedKey, ciphertext)

                    const fileContents = {
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
                        id: keyPair.getUID().toString(),
                    }

                    resolve(fileContents)
                },
            )
        })
    }


    /**
     * Loads key from encrypted file on disk
     * @param filePath 
     * @param password 
     * @returns key 
     */
    public static async loadKey(
        filePath: string,
        password: string,
    ): Promise<RadixKeyPair> {
        return new Promise<RadixKeyPair>((resolve, reject) => {
            // Read keystore file
            fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) { return reject(err) }
                const fileContents = JSON.parse(data)

                return resolve(this.decryptKey(fileContents, password))
            })
        })
    }

    /**
     * Decrypts an encrypted private key
     * @param fileContents 
     * @param password 
     * @returns key 
     */
    public static decryptKey(fileContents: any, password: string): Promise<RadixKeyPair> {
        return new Promise<RadixKeyPair>((resolve, reject) => {
            // Derrive key
            const salt = fileContents.crypto.pbkdfparams.salt
            const iterations = fileContents.crypto.pbkdfparams.iterations
            const keylen = fileContents.crypto.pbkdfparams.keylen
            const digest = fileContents.crypto.pbkdfparams.digest

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
                    const algorithm = fileContents.crypto.cipher
                    const iv = Buffer.from(
                        fileContents.crypto.cipherparams.iv,
                        'hex',
                    )
                    const ciphertext = Buffer.from(
                        fileContents.crypto.ciphertext,
                        'hex',
                    )

                    // Check MAC
                    const mac = Buffer.from(fileContents.crypto.mac, 'hex')
                    const computedMac = this.calculateMac(
                        derivedKey,
                        ciphertext,
                    )
                    if (!computedMac.equals(mac)) {
                        return reject('MAC mismatch')
                    }

                    const decipher = crypto.createDecipheriv(
                        algorithm,
                        derivedKey,
                        iv,
                    )

                    const privateKey = Buffer.concat([
                        decipher.update(ciphertext),
                        decipher.final(),
                    ]).toString()

                    // Create wallet
                    const keyPair = RadixKeyPair.fromPrivate(privateKey)

                    return resolve(keyPair)
                },
            )
        })
    }


    private static calculateMac(derivedKey: Buffer, ciphertext: Buffer) {
        const dataToMac = Buffer.concat([derivedKey, ciphertext])
        return RadixUtil.hash(dataToMac)
    }
}
