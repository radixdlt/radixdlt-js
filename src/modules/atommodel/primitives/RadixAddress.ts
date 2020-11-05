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

import { RadixEUID, RadixPrimitive, RadixSerializer } from '..'
import bs58 from 'bs58'
import { radixHash } from '../../..'
import PublicKey from '../../crypto/PublicKey'


const id = ':adr:'
@RadixSerializer.registerPrimitive(id)
export class RadixAddress implements RadixPrimitive {

    private readonly magicByte: number // should be a single byte
    public readonly publicKey: PublicKey

    constructor(magicByte: number, publicKey: PublicKey) {
        if (!magicByte) {
            throw new Error('Missing magic Byte')
        }
        if (magicByte > 0xFF) {
            throw new Error('Magic byte should be a byte.')
        }
        this.magicByte = magicByte
        this.publicKey = publicKey
    }

    public static fromAddress(base58String: string): RadixAddress {
        let raw = Array.prototype.slice.call(bs58.decode(base58String), 0)

        // Checksum
        const check = radixHash(
            raw.splice(0, raw.length - 4),
            0,
            raw.length - 4,
        )
        for (let i = 0; i < 4; i++) {
            if (check[i] !== raw[raw.length - 4 + i]) {
                throw new Error('Invalid address')
            }
        }

        raw = Array.prototype.slice.call(bs58.decode(base58String), 0)

        return RadixAddress.fromPublicKeyBytes(
            Buffer.from(raw.splice(1, raw.length - 5)),
            raw[0],
        )
    }

    public static fromPublicKeyBytes(publicKeyBytes: Buffer, magicByte: number): RadixAddress {
        if (!publicKeyBytes) {
            throw new Error('Missing public key')
        }
        if (publicKeyBytes.length !== 33) {
            throw new Error('Public key must be 33 bytes, but was ' + publicKeyBytes.length)
        }

        return new this(
            magicByte,
            new PublicKey(publicKeyBytes),
        )
    }

    public getAddressBytes(): Buffer {
        const publicKey = this.publicKey.compressPublicKeyBytes
        const addressBytes: any = []

        addressBytes[0] = this.magicByte
        for (let i = 0; i < publicKey.length; i++) {
            addressBytes[i + 1] = publicKey[i]
        }

        const check = radixHash(addressBytes, 0, publicKey.length + 1)
        for (let i = 0; i < 4; i++) {
            addressBytes[publicKey.length + 1 + i] = check[i]
        }
        return Buffer.from(addressBytes)
    }

    public getAddress(): string {
        return bs58.encode(this.getAddressBytes())
    }

    public getHash(): Buffer {
        return this.publicKey.getHash()
    }

    public getUID(): RadixEUID {
        return this.publicKey.getUID()
    }

    public getPublic(): Buffer {
        // return Buffer.from(this.keyPair.getPublic(true, 'array'))
        return this.publicKey.compressPublicKeyBytes
    }

    public equals(otherAddress: this) {
        return this.getAddress() === otherAddress.getAddress()
    }

    public toString() {
        return this.getAddress()
    }

    public static fromJSON(address: string) {
        return this.fromAddress(address)
    }

    public toJSON() {
        return `${id}${this.getAddress()}`
    }

    public toDSON(): Buffer {
        return RadixSerializer.toDSON(this)
    }

    public encodeCBOR(encoder) {
        const addressBuffer = this.getAddressBytes()

        const output = Buffer.alloc(addressBuffer.length + 1)
        output.writeInt8(0x04, 0)
        addressBuffer.copy(output, 1)

        return encoder.pushAny(output)
    }
}
