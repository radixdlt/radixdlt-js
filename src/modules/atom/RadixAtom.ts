import RadixParticle from './RadixParticle'
import RadixEUID from '../common/RadixEUID';



export default abstract class RadixAtom extends RadixParticle {
    particles: Array<RadixParticle>
    temporal_proof: {
        atom_id: string
        serializer: number
        version: number
        vertices: Array<any>
    }
    hid: RadixEUID
    timestamps: {
        default: number
    }

    constructor(json?: object) {
        super(json)

        this.serializationProperties.push('particles')
        this.serializationProperties.push('timestamps')
    }

    static compare = (a: RadixAtom, b: RadixAtom) => {
        return a.timestamps.default - b.timestamps.default
    }

}
