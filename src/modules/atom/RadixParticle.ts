import {
    RadixEUID,
    RadixSignature,
    RadixBasicContainer,
    RadixECKeyPair
} from '../atom_model'

export default abstract class RadixParticle extends RadixBasicContainer {
    public static SERIALIZER: number

    action: string
    destinations: Array<RadixEUID>
    owners: Array<RadixECKeyPair>
    serializer: number
    signatures: { [id: string]: RadixSignature }

    constructor(json?: object) {
        super(json)

        this.serializationProperties.push('action')
        this.serializationProperties.push('destinations')
        this.serializationProperties.push('owners')
    }
}
