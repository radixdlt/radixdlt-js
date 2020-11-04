import { RadixECSignature, RadixEUID } from '../atommodel'
import PrivateKey from './PrivateKey'

import EC, { curve } from 'elliptic'
import { radixHash } from '../..'
import ECPointOnCurve from './ECPointOnCurve'
import BN from 'bn.js'

const ec = new EC.ec('secp256k1')

export default class PublicKey {
    public readonly compressPublicKeyBytes: Buffer
    public point: ECPointOnCurve

    constructor(compressPublicKeyBytes: Buffer) {
        const point = PublicKey.validate(compressPublicKeyBytes)
        this.compressPublicKeyBytes = compressPublicKeyBytes
        this.point = point
    }

    public static fromPrivateKey(privateKey: PrivateKey): PublicKey {
        return privateKey.publicKey()
    }

    // PublicKey | Buffer | string
    public static from(
        key: PublicKey | Buffer | string,
    ): PublicKey {
        if (key instanceof PublicKey) {
            return key
        } else if (key instanceof Buffer) {
            return new PublicKey(Buffer.from(key))
        } else {
            return new PublicKey(Buffer.from(key))
        }
    }

    public verifyThatSigningDataWithThisKeyProducesSignature(data: Buffer, signature: RadixECSignature): boolean {
        return EC.ec.prototype.verify(
            data,
            {r: new BN(signature.r.bytes), s: new BN(signature.s.bytes)},
            this.compressPublicKeyBytes,
        )
    }

    public equals(other: PublicKey) {
        return this.compressPublicKeyBytes.equals(other.compressPublicKeyBytes)
    }

    public getHash(): Buffer {
        return radixHash(this.compressPublicKeyBytes, 0, this.compressPublicKeyBytes.length)
    }

    public getUID(): RadixEUID {
        const hash = this.getHash()
        return new RadixEUID(hash.slice(0, 16))
    }

    private static validate(buffer: Buffer): ECPointOnCurve {

        const jsLibEllipticKeyPair = ec.keyFromPublic(buffer, 'hex')

        const validation = jsLibEllipticKeyPair.validate()
        if (!validation.result) {
            throw new Error(`Invalid key: ${validation.reason}`)
        }
        const point = jsLibEllipticKeyPair.getPublic()
        return new ECPointOnCurve(point.getX(), point.getY())
    }
}
