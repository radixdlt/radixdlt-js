import RadixParticle from './RadixParticle'
import RadixEUID from '../common/RadixEUID'


export default class RadixConsumable extends RadixParticle {
    public static SERIALIZER = 318720611
    
    asset_id: RadixEUID
    quantity: number
    nonce: number


    constructor(json?: object) {
        super(json)

        this.serializationProperties.push('asset_id')
        this.serializationProperties.push('quantity')
        this.serializationProperties.push('nonce')
    }
}
