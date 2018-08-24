import * as crypto from 'crypto'
import Long from 'long';

const BN = require('bn.js')

export default class RadixUtil {

    public static hash(data: Buffer| Array<number>, offset?: number, len?: number): Buffer {
        if (offset) {
            data = data.slice(offset, len)
        }

        if (!Buffer.isBuffer(data)) {
            data = Buffer.from(data)
        }

        // Double hash to protect against length extension attacks
        const hash1 = crypto.createHash('sha256')
        hash1.update(data)

        const hash2 = crypto.createHash('sha256')
        hash2.update(hash1.digest())

        return hash2.digest()
    }


    public static bigIntFromByteArray(bytes: Buffer): any {
        return new BN(bytes).fromTwos(bytes.length * 8)
    }


    public static byteArrayFromBigInt(number: any): Buffer {
        return number.toTwos(8 * number.byteLength()).toBuffer()
    }

    public static longFromBigInt(number: any) {
        // Emulate Java BigInteger.longValue(), following the spec at 5.1.3 https://docs.oracle.com/javase/specs/jls/se7/html/jls-5.html
        let byteLength = Math.max(8, number.byteLength())
        const bytes = number.toTwos(8 * byteLength).toArray('be', byteLength)
        const truncatedBytes = bytes.slice(bytes.length - 8, bytes.length)
        return Long.fromBytesBE(truncatedBytes)
    }

    public static bigIntFromLong(number: Long) {
        return new BN(number.toBytesBE(), 'be').fromTwos(64)
    }


    public static powTargetFromAtomSize(size: number): Buffer {
        const target = Buffer.alloc(32, 0xFF)
        
        const leadingBits = Math.ceil(Math.log(size*8))
        const leadingBytes = Math.floor(leadingBits / 8)
        const leftOverBits = leadingBits % 8

        target.fill(0, 0, leadingBytes)

        const middleByte = ~(0xFF << (8 - leftOverBits)) & 0xFF

        target.writeUInt8(middleByte, leadingBytes)

        return target
    }


    public static shuffleArray = arr => (
        arr
            .map(a => [Math.random(), a])
            .sort((a, b) => a[0] - b[0])
            .map(a => a[1])
    )

}
