import { TSMap } from 'typescript-map'



import {RadixApplicationPayloadAtom,
    RadixBasicPayloadAtom,
    RadixConsumable,
    RadixConsumer,
    RadixECKeyPair,
    RadixEmission,
    RadixNullAtom,
    RadixNullJunk,
    RadixSignature,
    RadixTransactionAtom,
    RadixBase64,
    RadixEUID,
    RadixHash,
    RadixEncryptor,
    RadixAtomFeeConsumable,
    RadixFeeConsumable,
    RadixTokenClass,
    } from '../atom_model'


import * as Long from 'long'

export enum DataTypes {
  BOOLEAN = 1,
  NUMBER = 2,
  STRING = 3,
  BYTES = 4,
  OBJECT = 5,
  ARRAY = 6,
  EUID = 7,
  HASH = 8
}

export default class RadixSerializer {
  public static fromJson(json: any): any {
    if (Array.isArray(json)) {
      let output = []
      for (let item of json) {
        output.push(RadixSerializer.fromJson(item))
      }
      return output
    } else if (typeof json === 'object') {
      return RadixSerializer.fromJsonObject(json)
    } else {
      return json
    }
  }

  public static fromJsonObject(jsonObject: object) {
    let output = {}

    for (let key in jsonObject) {
      output[key] = RadixSerializer.fromJson(jsonObject[key])
    }

    if ('serializer' in output) {
      let type = output['serializer']

      switch (type) {
        case RadixEUID.SERIALIZER:
          return RadixEUID.fromJson(output)
        case RadixHash.SERIALIZER:
          return RadixHash.fromJson(output)
        case RadixBase64.SERIALIZER:
          return RadixBase64.fromJson(output)
        case RadixNullAtom.SERIALIZER:
          return new RadixNullAtom(output)
        case RadixNullJunk.SERIALIZER:
          return new RadixNullJunk(output)
        case RadixSignature.SERIALIZER:
          return new RadixSignature(output)
        case RadixBasicPayloadAtom.SERIALIZER:
          return new RadixBasicPayloadAtom(output)
        case RadixApplicationPayloadAtom.SERIALIZER:
          return new RadixApplicationPayloadAtom(output)
        case RadixECKeyPair.SERIALIZER:
          return new RadixECKeyPair(output)
        case RadixEncryptor.SERIALIZER:
          return new RadixEncryptor(output)
        case RadixTransactionAtom.SERIALIZER:
          return new RadixTransactionAtom(output)
        case RadixEmission.SERIALIZER:
          return new RadixEmission(output)
        case RadixConsumable.SERIALIZER:
          return new RadixConsumable(output)
        case RadixConsumer.SERIALIZER:
          return new RadixConsumer(output)
        case RadixTokenClass.SERIALIZER:
          return new RadixTokenClass(output)
        case RadixFeeConsumable.SERIALIZER:
          return new RadixFeeConsumable(output)
        case RadixAtomFeeConsumable.SERIALIZER:
          return new RadixAtomFeeConsumable(output)

        default:
          // throw new Error('Serializer "' + type + '" not implemented')
          break
      }
    }

    return output
  }

  public static toJson(data: any): any {
    if (Array.isArray(data)) {
      let output = []
      for (let item of data) {
        output.push(RadixSerializer.toJson(item))
      }
      return output
    } else if (data !== null && typeof data === 'object') {
      if (typeof data.toJson === 'function') {
        return data.toJson()
      } else {
        let output = {}
        for (let key in data) {
          let serialized = RadixSerializer.toJson(data[key])
          if (serialized) {
            output[key] = serialized
          }
        }
        return output
      }
    } else if (
      typeof data === 'string' ||
      typeof data === 'number' ||
      typeof data === 'boolean'
    ) {
      return data
    }
  }

  public static fromByteArray(bytes: Buffer): any {
    // Read 1 byte for type
    let type = bytes.readUInt8(0)
    // Read 4 bytes for length
    let length = bytes.readUInt32BE(1)

    // Switch on type
    switch (type) {
      case DataTypes.BOOLEAN: {
        return bytes.readUInt8(5) ? true : false
      }
      case DataTypes.NUMBER: {
        return Long.fromBytesBE([...bytes.slice(5, 13)]).toNumber()
      }
      case DataTypes.STRING: {
        return bytes.slice(5, 5 + length).toString('utf8')
      }
      case DataTypes.BYTES: {
        return new RadixBase64(bytes.slice(5, 5 + length))
      }
      case DataTypes.OBJECT: {
        return this.fromObjectByteArray(bytes)
      }
      case DataTypes.ARRAY: {
        let output: Array<any> = []
        let offset = 5

        while (offset < length) {
          // Read 2nd to 5th bytes to find out the length of the value
          let valueLength = bytes.readUInt32BE(offset + 1)

          output.push(
            this.fromByteArray(bytes.slice(offset, offset + 5 + valueLength))
          )

          offset += 5 + valueLength
        }

        return output
      }
      case DataTypes.EUID: {
        return new RadixEUID(bytes.slice(5, 5 + length))
      }
      case DataTypes.HASH: {
        return new RadixHash(bytes.slice(5, 5 + length))
      }
    }
  }

  public static fromObjectByteArray(bytes: Buffer) {
    // Read 4 bytes for length
    let length = bytes.readUInt32BE(1)

    let offset = 5
    let output = {}
    while (offset < length + 5) {
      let keyLength = bytes.readUInt8(offset)
      offset++
      let key = bytes.slice(offset, offset + keyLength).toString('utf8')
      offset += keyLength

      // Read 2nd to 5th bytes to find out the length of the value
      let valueLength = bytes.readUInt32BE(offset + 1)

      output[key] = this.fromByteArray(
        bytes.slice(offset, offset + 5 + valueLength)
      )

      offset += 5 + valueLength
    }

    // Check if has serializer, cast
    if ('serializer' in output) {
      let type = output['serializer']

      switch (type) {
        case RadixNullAtom.SERIALIZER:
          return new RadixNullAtom(output)
        case RadixNullJunk.SERIALIZER:
          return new RadixNullJunk(output)
        case RadixSignature.SERIALIZER:
          return new RadixSignature(output)
        case RadixBasicPayloadAtom.SERIALIZER:
          return new RadixBasicPayloadAtom(output)
        case RadixECKeyPair.SERIALIZER:
          return new RadixECKeyPair(output)
        case RadixEncryptor.SERIALIZER:
          return new RadixEncryptor(output)

        default:
          // throw new Error('Serializer "' + type + '" not implemented')
          break
      }
    }

    return output
  }

  public static toByteArray(data: any): Buffer {
    let output: Buffer = new Buffer([])

    if (Array.isArray(data)) {
      let type = DataTypes.ARRAY
      let length = 0

      // Serialize all items
      let serialized = []
      for (let item of data) {
        let serializedItem = this.toByteArray(item)
        length += serializedItem.length
        serialized.push(serializedItem)
      }

      // Write everything to the buffer
      output = Buffer.alloc(length + 5)
      output.writeUInt8(type, 0)
      output.writeUInt32BE(length, 1)

      let position = 5
      for (let item of serialized) {
        item.copy(output, position)
        position += item.length
      }
    } else if (typeof data === 'object') {
      if (typeof data.toByteArray === 'function') {
        // Radix objects
        output = data.toByteArray()
      } else {
        // Generic object
        let type = DataTypes.OBJECT
        let length = 0

        // Serialize all properties
        // Build a map sorted by property name
        let map = new TSMap<string, Buffer>()
        for (let key in data) {
          let serializedValue = this.toByteArray(data[key])
          length += key.length + 1 + serializedValue.length
          map.sortedSet(key, serializedValue)
        }

        // Write everything to the buffer
        output = Buffer.alloc(length + 5)
        output.writeUInt8(type, 0)
        output.writeUInt32BE(length, 1)

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
      }
    } else if (typeof data === 'boolean') {
      let type = DataTypes.BOOLEAN
      let length = 1

      output = Buffer.alloc(length + 5)

      output.writeUInt8(type, 0)
      output.writeUInt32BE(length, 1)
      output.writeUInt8(data ? 1 : 0, 5)
    } else if (typeof data === 'number') {
      let type = DataTypes.NUMBER
      let length = 8
      let bufferData = Buffer.from(Long.fromNumber(data).toBytes())

      output = Buffer.alloc(length + 5)

      output.writeUInt8(type, 0)
      output.writeUInt32BE(length, 1)
      bufferData.copy(output, 5)
    } else if (typeof data === 'string') {
      let type = DataTypes.STRING
      let bufferData = Buffer.from(data, 'utf8')
      let length = bufferData.length

      output = Buffer.alloc(length + 5)

      output.writeUInt8(type, 0)
      output.writeUInt32BE(length, 1)
      bufferData.copy(output, 5)
    } else if (typeof data === 'function') {
      // Ignore
    } else {
      console.warn('Unknown type', data)
    }

    return output
  }
}
