import EC, { curve } from 'elliptic'
import BN from 'bn.js'
import { RadixECSignature } from '../atommodel'
import BasePoint = curve.base.BasePoint
import PublicKey from './PublicKey'
const ec = new EC.ec('secp256k1')

export default class ECPointOnCurve {
    public readonly x: BN
    public readonly y: BN
    private readonly multiplyByScalar: (scalar: BN) => ECPointOnCurve

    constructor(
        x: BN,
        y: BN,
    ) {
        const jsLibEllipticPoint = ECPointOnCurve.validate(x, y)
        this.x = x
        this.y = y
        this.multiplyByScalar = (scalar: BN): ECPointOnCurve => {
            const point = jsLibEllipticPoint.mul(scalar)
            return new ECPointOnCurve(point.getX(), point.getY())
        }
    }

    public multiply(scalar: BN): ECPointOnCurve {
        return this.multiplyByScalar(scalar)
    }

    private static validate(x: BN, y: BN): BasePoint {

        const keyPair = ec.keyFromPublic({ x: x.toString('hex'), y: y.toString('hex') })

        const validation = keyPair.validate()
        if (!validation.result) {
            throw new Error(`Invalid Point on the curve: ${validation.reason}`)
        }
        return keyPair.getPublic()
    }
}
