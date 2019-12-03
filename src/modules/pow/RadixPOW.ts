import Long from 'long'
import { radixHash } from '../common/RadixUtil'

export default class RadixPOW {
    public nonce: Long

    constructor(readonly magic: number, readonly seed: Buffer) {
        this.nonce = Long.fromNumber(1)
    }

    public getHash() {
        const data = Buffer.alloc(4 + this.seed.length + 8)
        data.writeInt32BE(this.magic, 0)
        this.seed.copy(data, 4)
        Buffer.from(this.nonce.toBytes()).copy(data, 4 + 32)

        return radixHash(data)
    }

    public incrementNonce() {
        this.nonce = this.nonce.add(1)
    }
}
