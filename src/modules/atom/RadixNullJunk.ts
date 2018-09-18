import { RadixParticle, RadixBase64 } from '../atom_model'

export default class RadixNullJunk extends RadixParticle {
    public static SERIALIZER = -1123054001

    public junk: RadixBase64

    constructor(json?: object) {
        super(json)

        this.serializationProperties.push('junk')
    }
}
