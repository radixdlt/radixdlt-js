import {
    RadixSerializer,
    RadixPrimitive,
    RadixAddress,
} from '..'

const id = ':rri:'
@RadixSerializer.registerPrimitive(id)
export class RRI implements RadixPrimitive {

    public readonly address: RadixAddress
    public readonly name: string
    
    constructor(address: RadixAddress, name: string) {
        this.address = address
        this.name = name
    }

    public static fromJSON(uri: string) {
        return this.fromString(uri)
    }

    public static fromString(uri: string) {
        const parts = uri.split('/')

        if (parts.length !== 3) {
            throw new Error('RRI must be of the format /:address/:unique')
        }

        return new this(RadixAddress.fromAddress(parts[1]), parts[2])
    }

    public toJSON() {
        return `${id}${this.toString()}`
    }

    public toString() {
        return `/${this.address.toString()}/${this.name}`
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

    public equals(rri: RRI) {
        return this.address.equals(rri.address) && this.name === rri.name
    }

    public getAddress() {
        return this.address
    }

    public getName() {
        return this.name
    }
}
