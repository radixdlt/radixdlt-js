import PublicKey from './PublicKey'
import PrivateKey from './PrivateKey'
import BN from 'bn.js'

export default class KeyPair {
    public readonly privateKey: PrivateKey
    public readonly publicKey: PublicKey

    constructor(
        privateKey: PrivateKey,
        publicKey: PublicKey,
    ) {
        this.privateKey = privateKey
        this.publicKey = publicKey
    }

    public static generateNew(): KeyPair {
        const privateKey = PrivateKey.generateNew()
        return new KeyPair(privateKey, privateKey.publicKey())
    }

    public static fromPrivateKey(
        privateKey: PrivateKey | Buffer | string | BN | number,
    ): KeyPair {
        const key = PrivateKey.from(privateKey)
        return new KeyPair(key, key.publicKey())
    }
}
