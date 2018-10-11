import {
    RadixEUID,
    RadixSignature,
    RadixBasicContainer,
    RadixECKeyPair
} from '../RadixAtomModel'

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
