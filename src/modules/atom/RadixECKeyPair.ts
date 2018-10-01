import { RadixBasicContainer, RadixKeyPair, RadixBase64 } from '../RadixAtomModel'

export default class RadixECKeyPair extends RadixBasicContainer {
    public static SERIALIZER = 547221307

    public: RadixBase64

    constructor(json?: object) {
        super(json)

        this.serializationProperties.push('public')
    }

    public static fromRadixKeyPair(keyPair: RadixKeyPair) {
        let ecKeyPair = new RadixECKeyPair()
        ecKeyPair.public = new RadixBase64(keyPair.getPublic())

        return ecKeyPair
    }
}
