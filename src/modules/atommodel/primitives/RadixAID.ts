import long from 'long'
import { RadixSerializer, RadixPrimitive } from '..';

const id = ':aid:'
@RadixSerializer.registerPrimitive(id)
export class RadixAID implements RadixPrimitive {

    public static BYTES = 32
    public static HASH_BYTES = 24
    public static SHARD_BYTES = 8


    private bytes: Buffer

    public constructor(bytes: Buffer) {
        if (bytes.length !== RadixAID.BYTES) {
            throw new Error(`Bytest lenght must be ${RadixAID.BYTES} but is ${bytes.length}`)
        }

        this.bytes = Buffer.from(bytes)
    }


    public static from(hash: Buffer, shards: long[]) {
        if(shards.length === 0) {
            throw new Error('Shards array cannot be empty')
        }

        const shardIndex = hash[0] % shards.length

        const selectedShard = shards
            .map(s => s.toUnsigned())
            .sort((a, b) => a.compare(b))
            .map(s => s.toSigned())
            [shardIndex]
        
        const bytes = Buffer.alloc(this.BYTES)
        hash.copy(bytes, 0, 0, this.HASH_BYTES)
        Buffer.from(selectedShard.toBytes()).copy(bytes, this.HASH_BYTES)

        return new this(bytes)
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
        output.writeInt8(0x08, 0)
        this.bytes.copy(output, 1)

        return encoder.pushAny(output)
    }


    public equals(aid: RadixAID) {
        return this.bytes.compare(aid.bytes) === 0
    }

    public toString(): string {
        return this.bytes.toString('hex')
    }

    public getShard() {        
        return long.fromBytes(Array.from(this.bytes.subarray(RadixAID.HASH_BYTES)))
    }
}
