import { RadixSerializer, RadixEUID, RadixECSignature, RadixPrimitive } from '..'

import BN from 'bn.js'
import EC from 'elliptic'
import bs58 from 'bs58'
import { RadixUtil, radixUniverse } from '../../..'

const universe = radixUniverse
const ec = new EC.ec('secp256k1')

const id = ':adr:'
@RadixSerializer.registerPrimitive(id)
export class RadixAddress implements RadixPrimitive {

    private magicByte = 0

    public keyPair: EC.ec

    constructor(magicByte?: number) {
        if (magicByte) {
            this.magicByte = magicByte
        } else if (universe.initialized) {
            this.magicByte = universe.getMagicByte()
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
        if (universe.getMagicByte() !== raw[0]) {
            throw new Error('Address is from a different universe')
        }

        // Checksum
        const check = RadixUtil.hash(
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

        const radixAddress = new this()
        radixAddress.keyPair = ec.keyFromPublic(raw.splice(1, raw.length - 5))

        return radixAddress
    }

    public static fromPublic(publicKey: Buffer) {
        if (!publicKey) {
            throw new Error('Missing public key')
        }
        if (publicKey.length !== 33) {
            throw new Error('Public key must be 33 bytes, but was ' + publicKey.length)
        }

        const radixAddress = new this()
        radixAddress.keyPair = ec.keyFromPublic(publicKey)

        return radixAddress
    }

    public static fromPrivate(privateKey: Buffer | string) {
        const radixAddress = new this()
        radixAddress.keyPair = ec.keyFromPrivate(privateKey)

        return radixAddress
    }

    public getAddressBytes() {
        const publicKey = this.keyPair.getPublic().encode('be', true)
        const addressBytes: any = []

        addressBytes[0] = this.magicByte
        for (let i = 0; i < publicKey.length; i++) {
            addressBytes[i + 1] = publicKey[i]
        }

        const check = RadixUtil.hash(addressBytes, 0, publicKey.length + 1)
        for (let i = 0; i < 4; i++) {
            addressBytes[publicKey.length + 1 + i] = check[i]
        }
        return Buffer.from(addressBytes)
    }

    public getAddress() {
        return bs58.encode(this.getAddressBytes())
    }

    public getHash() {
        return RadixUtil.hash(this.getPublic(), 0, this.getPublic().length)
    }

    public getUID() {
        const hash = this.getHash()

        return new RadixEUID(hash.slice(0, 12))
    }

    public getShard(): Long {
        return RadixUtil.longFromBigInt(this.getUID().shard)
    }

    public getPublic(): Buffer {
        return Buffer.from(this.keyPair.getPublic().encode('be', true))
    }

    public getPrivate(enc?: string): BN | string {
        return this.keyPair.getPrivate(enc)
    }

    public sign(data: Buffer) {
        const signature = this.keyPair.sign(data)

        return RadixECSignature.fromEllasticSignature(signature)
    }

    public verify(data: Buffer, signature: RadixECSignature) {
        return this.keyPair.verify(data, EC.Signature(signature))
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
