import { RadixSerializer, RadixPrimitive } from '..'

@RadixSerializer.registerPrimitive(':byt:')
export class RadixBytes implements RadixPrimitive {
    public readonly bytes: Buffer

    constructor(bytes: any) {
        this.bytes = Buffer.from(bytes)
    }

    public static fromEncoded(encoded: string) {
        return new this(Buffer.from(encoded, 'base64'))
    }

    public static fromJSON(bytes: string) {
        return this.fromEncoded(bytes)
    }

    public toJSON() {
        return `:byt:${this.bytes.toString('base64')}`
    }

    public toDSON(): Buffer {
        return RadixSerializer.toDSON(this)
    }

    public encodeCBOR(encoder) {
        const output = Buffer.alloc(this.bytes.length + 1)
        output.writeInt8(0x01, 0)
        this.bytes.copy(output, 1)

        return encoder.pushAny(output)
    }

    public toString() {
        return this.bytes.toString()
    }
}
