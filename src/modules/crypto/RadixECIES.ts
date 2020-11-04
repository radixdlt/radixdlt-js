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

import BufferReader from 'buffer-reader'
import crypto from 'crypto'
import DecryptionError from './DecryptionError'
import PublicKey from './PublicKey'
import PrivateKey from './PrivateKey'
import KeyPair from './KeyPair'

export default class RadixECIES {

    public static decrypt(privateKey: PrivateKey, encrypted: Buffer) {
        const reader = new BufferReader(encrypted)
        const iv = reader.nextBuffer(16)
        const ephemeralPublicKeyBuffer = reader.nextBuffer(reader.nextUInt8())
        const ciphertext = reader.nextBuffer(reader.nextUInt32BE())
        const MAC = reader.nextBuffer(32)

        const ephemeralPublicKey = PublicKey.from(ephemeralPublicKeyBuffer)

        const pointM = privateKey.multiply(ephemeralPublicKey)

        // Double hash to prevent length extension attacks
        const hash = crypto
            .createHash('sha512')
            .update(
                crypto
                    .createHash('sha512')
                    .update(pointM.x.toBuffer())
                    .digest(),
            )
            .digest()
        const encryptionKey = hash.slice(0, 32)
        const MACKey = hash.slice(32)

        const computedMAC = this.calculateMAC(
            MACKey,
            iv,
            ephemeralPublicKeyBuffer,
            ciphertext,
        )

        // Verify MAC
        if (!computedMAC.equals(MAC)) {
            throw DecryptionError.macMismatch
        }

        const plaintext = this.AES256CbcDecrypt(iv, encryptionKey, ciphertext)
        return plaintext
    }

    public static encrypt(publicKey: PublicKey, plaintext: Buffer) {
        const ephemeralPrivateKey = PrivateKey.generateNew()
        const ephemeralPublicKey = ephemeralPrivateKey.publicKey()
        const pointM = ephemeralPrivateKey.multiply(publicKey)

        // Double hash to preven lenght extension attacks
        const hash = crypto
            .createHash('sha512')
            .update(
                crypto
                    .createHash('sha512')
                    .update(pointM.x.toBuffer())
                    .digest(),
            )
            .digest()

        const iv = crypto.randomBytes(16)
        const encryptionKey = hash.slice(0, 32)
        const MACKey = hash.slice(32)
        const ciphertext = this.AES256CbcEncrypt(iv, encryptionKey, plaintext)
        const MAC = this.calculateMAC(
            MACKey,
            iv,
            ephemeralPublicKey.compressPublicKeyBytes,
            ciphertext,
        )

        let offset = 0
        const serializedCiphertext = Buffer.alloc(
            iv.length +
            1 +
            ephemeralPublicKey.compressPublicKeyBytes.length +
            4 +
            ciphertext.length +
            MAC.length,
        )

        // IV
        iv.copy(serializedCiphertext, 0)
        offset += iv.length

        // Ephemeral key
        serializedCiphertext.writeUInt8(ephemeralPublicKey.compressPublicKeyBytes.length, offset)
        offset++
        ephemeralPublicKey.compressPublicKeyBytes.copy(serializedCiphertext, offset)
        offset += ephemeralPublicKey.compressPublicKeyBytes.length

        // Ciphertext
        serializedCiphertext.writeUInt32BE(ciphertext.length, offset)
        offset += 4
        ciphertext.copy(serializedCiphertext, offset)
        offset += ciphertext.length

        // MAC
        MAC.copy(serializedCiphertext, offset)

        return serializedCiphertext
    }

    public static calculateMAC(
        MACKey: Buffer,
        iv: Buffer,
        ephemPubKeyEncoded: Buffer,
        ciphertext: Buffer,
    ) {
        const dataToMAC = Buffer.concat([iv, ephemPubKeyEncoded, ciphertext])
        return crypto
            .createHmac('sha256', MACKey)
            .update(dataToMAC)
            .digest()
    }

    /**
     * AES-256 CBC encrypt
     * @param {Buffer} iv
     * @param {Buffer} key
     * @param {Buffer} plaintext
     * @returns {Buffer} ciphertext
     */
    public static AES256CbcEncrypt = (iv: Buffer, key: Buffer, plaintext: Buffer) => {
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
        const firstChunk = cipher.update(plaintext)
        const secondChunk = cipher.final()
        return Buffer.concat([firstChunk, secondChunk])
    }

    /**
     * AES-256 CBC decrypt
     * @param {Buffer} iv
     * @param {Buffer} key
     * @param {Buffer} ciphertext
     * @returns {Buffer} plaintext
     */
    public static AES256CbcDecrypt = (iv: Buffer, key: Buffer, ciphertext: Buffer) => {
        const cipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
        const firstChunk = cipher.update(ciphertext)
        const secondChunk = cipher.final()
        return Buffer.concat([firstChunk, secondChunk])
    }



    public static encryptForMultiple(
        recipientsPublicKeys: PublicKey[],
        plaintext: Buffer,
    ): { protectors: Buffer[], ciphertext: Buffer} {

        // Generate key pair
        const ephemeralKeyPair = KeyPair.generateNew()

        // Encrypt protectors
        const protectors = recipientsPublicKeys.map((recipient) => {
            return this.encrypt(
                recipient,
                ephemeralKeyPair.privateKey.toBuffer(),
            )
        })

        // Encrypt message
        const ciphertext = RadixECIES.encrypt(
            ephemeralKeyPair.publicKey,
            plaintext,
        )

        return {
            protectors: protectors,
            ciphertext: ciphertext,
        }
    }

    public static decryptWithProtectors(
        privateKey: PrivateKey,
        protectors: Buffer[],
        ciphertext: Buffer,
    ): Buffer {

        for (const protector of protectors) {
            try {
                const decryptedBuffer = this.decrypt(privateKey, protector)
                const ephemeralPrivateKey = PrivateKey.from(decryptedBuffer)
                try {
                    return this.decrypt(ephemeralPrivateKey, ciphertext)
                } catch (error) {
                    // Decrypted a protector, but unable to decrypt ciphertext with acquired private key => proceed with next 'protector'.
                }
            } catch (error) {
                // Do nothing, another protector might work
            }
        }

        throw DecryptionError.keyMismatch
    }
}
