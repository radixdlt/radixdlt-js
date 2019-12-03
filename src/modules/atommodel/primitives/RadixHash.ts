import { RadixSerializer, RadixPrimitive } from '..'

const id = ':hsh:'
@RadixSerializer.registerPrimitive(id)
export class RadixHash implements RadixPrimitive {

    public readonly bytes: Buffer
    
    constructor(bytes: any) {
        if (bytes.length !== 64) {
            throw new Error('Hash must be 64 bytes')
        }

        if (typeof bytes === 'string') {            
            this.bytes = Buffer.from(bytes, 'hex')
        } else {
            this.bytes = Buffer.from(bytes)
        }
    }

    public static fromJSON(data: string) {
        return new this(data)
    }

    public toJSON() {
        return `${id}${this.bytes.toString('hex')}`
    }

    public toDSON(): Buffer {
        return RadixSerializer.toDSON(this)
    }

    public encodeCBOR(encoder) {
        const output = Buffer.alloc(this.bytes.length + 1)
        output.writeInt8(0x03, 0)
        this.bytes.copy(output, 1)

        return encoder.pushAny(output)
    }
}
