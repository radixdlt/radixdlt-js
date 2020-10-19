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

import { RadixSerializer, RadixEUID, RadixECSignature, RadixPrimitive } from '..'

import EC from 'elliptic'
import bs58 from 'bs58'
import long from 'long'
import { radixUniverse, radixHash } from '../../..'

const ec = new EC.ec('secp256k1')

const id = ':adr:'
@RadixSerializer.registerPrimitive(id)
export class RadixAddress implements RadixPrimitive {
    public keyPair: EC.ec.KeyPair

    private magicByte

    constructor(magicByte?: number) {
        if (magicByte) {
            this.magicByte = magicByte
        }
    }

    public static generateNew() {
        const radixKeyPair = new RadixAddress()
        radixKeyPair.keyPair = ec.genKeyPair()

        return radixKeyPair
    }

    public static fromAddress(address: string) {
        let raw = Array.prototype.slice.call(bs58.decode(address), 0)

        // Universe check
        if (radixUniverse && radixUniverse.initialized && radixUniverse.getMagicByte() !== raw[0]) {
            throw new Error('Address is from a different universe')
        }

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

        raw = Array.prototype.slice.call(bs58.decode(address), 0)

        const radixAddress = new this(raw[0])
        radixAddress.keyPair = ec.keyFromPublic(raw.splice(1, raw.length - 5))

        return radixAddress
    }

    public static fromPublic(publicKey: Buffer, magicByte?: number) {
        if (!publicKey) {
            throw new Error('Missing public key')
        }
        if (publicKey.length !== 33) {
            throw new Error('Public key must be 33 bytes, but was ' + publicKey.length)
        }

        const radixAddress = new this(magicByte)
        radixAddress.keyPair = ec.keyFromPublic(publicKey)

        return radixAddress
    }

    public static fromPrivate(privateKey: Buffer | string, magicByte?: number) {
        const radixAddress = new this(magicByte)
        radixAddress.keyPair = ec.keyFromPrivate(privateKey)

        return radixAddress
    }

    public getAddressBytes() {
        const publicKey = this.keyPair.getPublic().encode('array', true)
        const addressBytes: any = []

        addressBytes[0] = this.magicByte ? this.magicByte : radixUniverse.getMagicByte()
        for (let i = 0; i < publicKey.length; i++) {
            addressBytes[i + 1] = publicKey[i]
        }

        const check = radixHash(addressBytes, 0, publicKey.length + 1)
        for (let i = 0; i < 4; i++) {
            addressBytes[publicKey.length + 1 + i] = check[i]
        }
        return Buffer.from(addressBytes)
    }

    public getAddress() {
        return bs58.encode(this.getAddressBytes())
    }

    public getHash() {
        return radixHash(this.getPublic(), 0, this.getPublic().length)
    }

    public getUID() {
        const hash = this.getHash()

        return new RadixEUID(hash.slice(0, 16))
    }

    public getPublic(): Buffer {
        return Buffer.from(this.keyPair.getPublic(true, 'array'))
    }

    public getPrivate(): Buffer {
        return this.keyPair.getPrivate().toArrayLike(Buffer)
    }

    public sign(data: Buffer) {
        const signature = this.keyPair.sign(data)
        return RadixECSignature.fromEllasticSignature(signature)
    }

    public verify(data: Buffer, signature: RadixECSignature) {
        return this.keyPair.verify(data, {r: signature.r.bytes, s: signature.s.bytes})
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
