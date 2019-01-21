import { RadixSerializer, RadixPrimitive, RadixAddress } from '..';

const id = ':rri:'
@RadixSerializer.registerPrimitive(id)
export class RadixResourceIdentifier implements RadixPrimitive {

    public readonly address: RadixAddress
    public readonly unique: string
    public readonly type: string
    
    constructor(address: RadixAddress, type: string, unique: string) {
        this.address = address
        this.unique = unique
        this.type = type
    }

    public static fromJSON(uri: string) {
        return this.fromString(uri)
    }

    public static fromString(uri: string) {
        const parts = uri.split('/')

        if (parts.length !== 4) {
            throw new Error('RRI must be of the format /:address/:type/:unique')
        }

        return new this(RadixAddress.fromAddress(parts[1]), parts[2], parts[3])
    }

    public toJSON() {
        return `${id}${this.toString()}`
    }

    public toString() {
        return `/${this.address.toString()}/${this.type}/${this.unique}`
    }

    public toDSON(): Buffer {
        return RadixSerializer.toDSON(this)
    }

    public encodeCBOR(encoder) {
        const s = Buffer.from(this.toString(), 'utf8')

        const output = Buffer.alloc(s.length + 1)
        output.writeInt8(0x06, 0)
        s.copy(output, 1)

        return encoder.pushAny(output)
    }
}
