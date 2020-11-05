import BN from 'bn.js'

import EC from 'elliptic'
import { RadixECSignature } from '../atommodel'
import PublicKey from './PublicKey'
import crypto from 'crypto'
import ECPointOnCurve from './ECPointOnCurve'
import { radixHash } from '../..'

const ec = new EC.ec('secp256k1')

export default class PrivateKey {
    // public readonly scalar: BN
    private readonly jsLibEllipticKeyPair: EC.ec.KeyPair

    private constructor(scalar: BN) {
        this.jsLibEllipticKeyPair = PrivateKey.jsLibEllipticKeyPairFromScalar(scalar)
    }

    public static generateNew(): PrivateKey {
        return PrivateKey.from(crypto.randomBytes(32))
    }

    public static importByHashingSeed(seedToHash: Buffer | number[]): PrivateKey {
        return PrivateKey.from(radixHash(seedToHash))
    }

    public static from(
        key: PrivateKey | Buffer | string | BN | number,
    ): PrivateKey {
        if (key instanceof PrivateKey) {
            return key
        } else if (key instanceof BN) {
            return new PrivateKey(key)
        } else if (key instanceof Buffer) {
            return new PrivateKey(new BN(key.toString('hex'), 'hex'))
        } else {
            return new PrivateKey(new BN(key, 'hex'))
        }
    }

    public multiply(pointOnCurve: ECPointOnCurve | PublicKey): ECPointOnCurve {
        const point = pointOnCurve instanceof ECPointOnCurve ? pointOnCurve : pointOnCurve.point
        return point.multiply(this.jsLibEllipticKeyPair.getPrivate())
    }

    public sign(
        data: Buffer,
        deterministic: boolean = true,
        canonical: boolean = true,
    ): RadixECSignature {

        const signingOptions: EC.ec.SignOptions = {
            canonical,
        }

        if (!deterministic) {
            signingOptions.k = new BN(crypto.randomBytes(32))
        }

        const signatureRandS = this.jsLibEllipticKeyPair.sign(
            data,
            signingOptions,
        )

        return new RadixECSignature(
            signatureRandS.r,
            signatureRandS.s,
        )
    }

    public publicKey(): PublicKey {
        return new PublicKey(Buffer.from(this.jsLibEllipticKeyPair.getPublic(true, 'array')))
    }

    public toBuffer(): Buffer {
        return Buffer.from(this.jsLibEllipticKeyPair.getPrivate('hex'), 'hex')
    }

    private static jsLibEllipticKeyPairFromScalar(scalar: BN): EC.ec.KeyPair {
        const keyPair = ec.keyFromPrivate(scalar.toString('hex'), 'hex')
        const validation = keyPair.validate()
        if (!validation.result) {
            throw new Error(`Invalid key: ${validation.reason}`)
        }
        return keyPair
    }
}
