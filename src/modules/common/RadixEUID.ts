import RadixUtil from './RadixUtil'

import { RadixSerializable, DataTypes } from '../RadixAtomModel'

import BN from 'bn.js'

export default class RadixEUID implements RadixSerializable {
    public static SERIALIZER = 'EUID'
    public value: BN

    constructor(value: any) {
        if (Array.isArray(value)) {
            this.value = RadixUtil.bigIntFromByteArray(Buffer.from(value))
        } else if (Buffer.isBuffer(value)) {
            this.value = RadixUtil.bigIntFromByteArray(value)
        } else {
            this.value = new BN(value)
        }
    }

    public static fromJson(data: { serializer: string; value: string }) {
        return new RadixEUID(data.value)
    }

    public equals(euid: RadixEUID) {
        return this.value.eq(euid.value)
    }

    public toJson() {
        return {
            serializer: RadixEUID.SERIALIZER,
            value: this.value.toString()
        }
    }

    public toByteArray() {
        let type = DataTypes.EUID
        let data = RadixUtil.byteArrayFromBigInt(this.value)
        let length = data.length

        let output = Buffer.alloc(length + 5)

        output.writeUInt8(type, 0)
        output.writeUInt32BE(length, 1)
        data.copy(output, 5)

        return output
    }

    public toString(): string {
        return this.value.toString()
    }
}
