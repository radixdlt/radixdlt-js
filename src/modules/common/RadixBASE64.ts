import {RadixSerializable, 
    DataTypes,
    } from '../atom_model'

export default class RadixBase64 implements RadixSerializable {
  public static SERIALIZER = 'BASE64'

  // public jsonProps

  readonly data: Buffer

  constructor(data: any) {
    this.data = Buffer.from(data)
  }

  public static fromEncoded(encoded: string) {
    return new RadixBase64(Buffer.from(encoded, 'base64'))
  }

  public static fromJson(data: any) {
    return RadixBase64.fromEncoded(data.value)
  }

  public toJson() {
    return {
      serializer: RadixBase64.SERIALIZER,
      value: this.data.toString('base64')
    }
  }

  toByteArray(): Buffer {
    let type = DataTypes.BYTES
    let length = this.data.length

    let output = Buffer.alloc(length + 5)

    output.writeUInt8(type, 0)
    output.writeUInt32BE(length, 1)
    this.data.copy(output, 5)

    return output
  }
}
