import { RadixSerializer, RadixPrimitive } from '..'
import BN from 'bn.js'

const id = ':u20:'
@RadixSerializer.registerPrimitive(id)
export class RadixUInt256 implements RadixPrimitive {

    public readonly value: BN

    constructor(value: number | string | BN) {
        this.value = new BN(value)
    }

    public static fromJSON(encoded: string) {
        return new this(new BN(encoded, 10))
    }

    public toJSON() {
        return `${id}${this.value.toString(10)}`
    }

    public toDSON(): Buffer {
        return RadixSerializer.toDSON(this)
    }

    public encodeCBOR(encoder) {
        const encoded = this.value.toArrayLike(Buffer, 'be', 32)

        const output = Buffer.alloc(encoded.length + 1)
        output.writeInt8(0x05, 0)
        encoded.copy(output, 1)

        return encoder.pushAny(output)
    }

    public toString() {
        return this.value.toString(10)
    }

    public getValue() {
        return this.value
    }
}
