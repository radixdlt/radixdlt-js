import RadixSerializable from '../serializer/RadixSerializable'
import { DataTypes } from '../serializer/RadixSerializer'

export default class RadixHash implements RadixSerializable {
  public static SERIALIZER = 'HASH'

  private data: Buffer

  constructor(data: string | Buffer) {
    if (typeof data == 'string') {
      if (data.length != 64) {
        throw new Error('Hash must be 64 bytes')
      }

      this.data = Buffer.from(data, 'hex')
    } else if (Buffer.isBuffer(data)) {
      this.data = data
    } else {
      throw new Error('Invalid data type for a hash')
    }
  }

  public static fromJson(data: { serializer: string; value: string }) {
    return new RadixHash(data.value)
  }

  toJson() {
    return {
      serializer: RadixHash.SERIALIZER,
      value: this.data.toString('hex')
    }
  }

  toByteArray() {
    let type = DataTypes.HASH
    let length = this.data.length

    let output = Buffer.alloc(length + 5)

    output.writeUInt8(type, 0)
    output.writeUInt32BE(length, 1)
    this.data.copy(output, 5)

    return output
  }
}
