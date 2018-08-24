import RadixBasicContainer from './RadixBasicContainer'
import RadixBASE64 from '../common/RadixBASE64'
import RadixKeyPair from '../wallet/RadixKeyPair'

export default class RadixECKeyPair extends RadixBasicContainer {
    public static SERIALIZER = 547221307
    
    public: RadixBASE64

    constructor(json?: object) {
        super(json)

        this.serializationProperties.push('public')
    }
    
    public static fromRadixKeyPair(keyPair: RadixKeyPair) {
        let ecKeyPair = new RadixECKeyPair
        ecKeyPair.public = new RadixBASE64(keyPair.getPublic())

        return ecKeyPair
    }

}
