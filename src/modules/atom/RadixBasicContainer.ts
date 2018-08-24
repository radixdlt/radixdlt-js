import RadixSerializable from '../serializer/RadixSerializable'
import RadixSerializer, { DataTypes } from '../serializer/RadixSerializer'
import { TSMap } from 'typescript-map'
import RadixUtil from '../common/RadixUtil'
import RadixEUID from '../common/RadixEUID'

export default abstract class RadixBasicContainer implements RadixSerializable {

    version: number = 100
    id: RadixEUID

    protected serializationProperties = new Array<string>()

    constructor(json?: object) {
        if (json) {
            for (let key in json) {
                if (key == 'constructor' || key == 'serializationProperties') {
                    continue
                }

                this[key] = json[key]
            }            
        }

        //this.serializationProperties.push('serializer')
        this.serializationProperties.push('version')
    }

    get serializer() {
        return this.constructor['SERIALIZER']
    }

    set serializer(serializer) {
        //Do nothing
    }


    public toJson() {
        let output = {serializer: 0}
        for (let key in <any>this) { 
            let serialized = RadixSerializer.toJson(this[key])
            if (serialized) {
                output[key] = serialized
            }
        }

        output.serializer = this.constructor['SERIALIZER']
        return output
    }

    public toByteArray() {
        //Generic object
        let type = DataTypes.OBJECT
        let length = 0
        
        //Serialize all properties
        //Build a map sorted by property name
        let map = new TSMap<string, Buffer>()
        for (let key of this.serializationProperties) { 
            if (!(key in this)) {
                continue
            }

            let serializedValue = RadixSerializer.toByteArray(this[key])
            length += key.length + 1 + serializedValue.length
            map.sortedSet(key, serializedValue)
        }

        //Write everything to the buffer
        let output = Buffer.alloc(length + 5)
        output.writeUInt8(type, 0)
        output.writeUInt32BE(length, 1)
        
        //console.log(map)

        let position = 5
        for (let key of map.keys()) {
            let value = map.get(key)

            output.writeUInt8(key.length, position)
            position++
            output.write(key, position)
            position += key.length
            value.copy(output, position)
            position += value.length
        }

        return output
    }


    public getHash() {
        let serialized = this.toByteArray()
        
        return RadixUtil.hash(serialized)
    }

    public getHID() {
        let hash = this.getHash()
    
        return new RadixEUID(hash.slice(0, 12))
    }

    public get hid() {
        return this.getHID()
    }

    public set hid(hid: RadixEUID) {
        //do nothing
    }

    public get _id() {
        return this.hid.toString()
    }

    public set _id(_id) {
        //Do nothing
    }

    public getSize() {
        return this.toByteArray().length
    }
}
