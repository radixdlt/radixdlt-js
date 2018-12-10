import { RadixSerializer, includeJSON, includeDSON, JSON_PROPERTIES_KEY, DSON_PROPERTIES_KEY, RadixEUID } from '.';
import { RadixUtil } from '../..';

export class RadixSerializableObject {
    public static SERIALIZER = 0

    @includeJSON
    @includeDSON
    public version = 100

    constructor(...args: any[]) {
        //
    }


    public static fromJSON(json?: object) {
        // So that we can have constructors for the different classes
        const obj = Object.create(this.prototype)

        if (json) {
            for (const key in json) {
                if (key === 'constructor' || key === 'serializationProperties') {
                    continue
                }

                obj[key] = json[key]
            }
        }

        return obj
    }
    
    @includeDSON
    get serializer() {
        return (this.constructor as typeof RadixSerializableObject).SERIALIZER
    }

    set serializer(_) {
        // Ds nothing
    }


    public toJSON() {
        const constructor = this.constructor as typeof RadixSerializableObject        
        const output = { serializer: constructor.SERIALIZER }

        const serializationProps = Reflect.getMetadata(JSON_PROPERTIES_KEY, this)
        
        for (const key of serializationProps) {
            const serialized = RadixSerializer.toJSON(this[key])
            if (serialized !== 'undefined') {
                output[key] = serialized
            }
        }

        return output
    }

    public toDSON(): Buffer {
        return RadixSerializer.toDSON(this)
    }


    public encodeCBOR(encoder) {
        // Streaming encoding for maps
        const serializationProps = Reflect.getMetadata(DSON_PROPERTIES_KEY, this)

        if (!encoder.push(Buffer.from([0b1011_1111]))) {return false}
        
        for (const prop of serializationProps) {
            if (!encoder.pushAny(prop)) {return false}
            if (!encoder.pushAny(this[prop])) {return false}
        }

        if (!encoder.push(Buffer.from([0xFF]))) {return false}

        return true
    }


    public getHash() {
        return RadixUtil.hash(this.toDSON())
    }

    public getHID() {
        const hash = this.getHash()

        return new RadixEUID(hash.slice(0, 12))
    }

    public get hid() {
        return this.getHID()
    }

    public set hid(hid: RadixEUID) {
        // Do nothing
    }

    public get _id() {
        return this.hid.toString()
    }

    public set _id(_id) {
        // Do nothing
    }

    public getSize() {
        return this.toDSON().length
    }
}
