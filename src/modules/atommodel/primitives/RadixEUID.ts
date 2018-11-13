import { RadixSerializer } from '../RadixAtomModel';
import long from 'long'


const id = ':uid:'
@RadixSerializer.registerPrimitive(id)
export class RadixEUID {

    public readonly bytes: Buffer
    public readonly shard: long

    constructor(value: any) {
        if (value.length !== 16) {
            throw new Error('EUID must be 128bits, 16 bytes')
        }

        this.bytes = Buffer.from(value)

        this.shard = long.fromBytes([...this.bytes.slice(this.bytes.length - 8)])
    }

    public static fromJSON(data: string) {
        return new this(Buffer.from(data, 'hex'))
    }

    public toJSON() {
        return `${id}${this.bytes.toString('hex')}`
    }

    public toDSON(): Buffer {
        return RadixSerializer.toDSON(this)
    }

    public encodeCBOR(encoder) {
        const output = Buffer.alloc(this.bytes.length + 1)
        output.writeInt8(0x02, 0)
        this.bytes.copy(output, 1)

        encoder.pushAny(output)
    }


    public equals(euid: RadixEUID) {
        return this.bytes.compare(euid.bytes) === 0
    }

    public toString(): string {
        return this.bytes.toString('hex')
    }

}
