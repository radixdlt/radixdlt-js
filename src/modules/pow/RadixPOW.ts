import RadixUtil from '../common/RadixUtil'

import * as Long from 'long'

export default class RadixPOW {
    nonce: Long

    constructor(readonly magic: number, readonly seed: Buffer) {
        this.nonce = Long.fromNumber(1)
    }

    getHash() {
        const data = Buffer.alloc(4 + this.seed.length + 8)
        data.writeInt32BE(this.magic, 0)
        this.seed.copy(data, 4)
        Buffer.from(this.nonce.toBytes()).copy(data, 4 + 32)

        return RadixUtil.hash(data)
    }

    incrementNonce() {
        this.nonce = this.nonce.add(1)
    }
}
