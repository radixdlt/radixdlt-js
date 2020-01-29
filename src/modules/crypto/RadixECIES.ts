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
import EC from 'elliptic'
import crypto from 'crypto'
import RadixDecryptionProvider from '../identity/RadixDecryptionProvider';

const ec = new EC.ec('secp256k1')

export default class RadixECIES {
    public static decrypt(privKey: Buffer, encrypted: Buffer) {
        let reader = new BufferReader(encrypted)

        const iv = reader.nextBuffer(16)
        const ephemPubKeyEncoded = reader.nextBuffer(reader.nextUInt8())
        const ciphertext = reader.nextBuffer(reader.nextUInt32BE())
        const MAC = reader.nextBuffer(32)

        const ephemPubKey = ec.keyFromPublic(ephemPubKeyEncoded).getPublic()

        const px = ec.keyFromPrivate(privKey).derive(ephemPubKey)
        // Double hash to prevent length extension attacks
        const hash = crypto
            .createHash('sha512')
            .update(
                crypto
                    .createHash('sha512')
                    .update(px.toArrayLike(Buffer))
                    .digest()
            )
            .digest()
        const encryptionKey = hash.slice(0, 32)
        const MACKey = hash.slice(32)

        const computedMAC = this.calculateMAC(
            MACKey,
            iv,
            ephemPubKeyEncoded,
            ciphertext,
        )

        // Verify MAC
        if (!computedMAC.equals(MAC)) {
            throw new Error('MAC mismatch')
        }

        const plaintext = this.AES256CbcDecrypt(iv, encryptionKey, ciphertext)
        return plaintext
    }

    public static encrypt(pubKeyTo: Buffer, plaintext: Buffer) {
        const ephemPrivKey = ec.keyFromPrivate(crypto.randomBytes(32))
        const ephemPubKey = ephemPrivKey.getPublic()
        const ephemPubKeyEncoded = Buffer.from(ephemPubKey.encode('array', true) as Buffer)
        // Every EC public key begins with the 0x04 prefix before giving the location of the two point on the curve
        // const px = ephemPrivKey.derive(ec.keyFromPublic(Buffer.concat([Buffer.from([0x04]), pubKeyTo])).getPublic())
        const px = ephemPrivKey.derive(ec.keyFromPublic(pubKeyTo).getPublic())
        // Double hash to preven lenght extension attacks
        const hash = crypto
            .createHash('sha512')
            .update(
                crypto
                    .createHash('sha512')
                    .update(px.toArrayLike(Buffer))
                    .digest()
            )
            .digest()

        const iv = crypto.randomBytes(16)
        const encryptionKey = hash.slice(0, 32)
        const MACKey = hash.slice(32)
        const ciphertext = this.AES256CbcEncrypt(iv, encryptionKey, plaintext)
        const MAC = this.calculateMAC(
            MACKey,
            iv,
            ephemPubKeyEncoded,
            ciphertext,
        )

        let offset = 0
        const serializedCiphertext = Buffer.alloc(
            iv.length +
            1 +
            ephemPubKeyEncoded.length +
            4 +
            ciphertext.length +
            MAC.length,
        )

        // IV
        iv.copy(serializedCiphertext, 0)
        offset += iv.length

        // Ephemeral key
        serializedCiphertext.writeUInt8(ephemPubKeyEncoded.length, offset)
        offset++
        ephemPubKeyEncoded.copy(serializedCiphertext, offset)
        offset += ephemPubKeyEncoded.length

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



    public static encryptForMultiple(recipientsPublicKeys: Buffer[], plaintext: Buffer)  {
        // Generate key pair        
        const ephemeral = ec.genKeyPair()
        const ephemeralPriv = Buffer.from(ephemeral.getPrivate('hex'), 'hex')

        // Encrypt protectors
        const protectors = recipientsPublicKeys.map((recipient) => {
            return this.encrypt(
                recipient,
                ephemeralPriv,
            )
        })

        // Encrypt message
        const ciphertext = RadixECIES.encrypt(
            Buffer.from(ephemeral.getPublic(true, 'array')),
            plaintext,
        )

        return {
            protectors,
            ciphertext,
        }
    }

    public static decryptWithProtectors(privKey: Buffer, protectors: Buffer[], ciphertext: Buffer) {
        for (const protector of protectors) {
            try {
                const ephemPrivKey = this.decrypt(privKey, protector)
                try {
                    return this.decrypt(ephemPrivKey, ciphertext)
                } catch (error) {
                    throw new Error('Decrypted a protector, but unable to decrypt ciphertext with acquired private key')
                }
            } catch (error) {
                // Do nothing, another protector might work
            }
        }

        throw new Error('Unable to decrypt any protectors')
    }
}
