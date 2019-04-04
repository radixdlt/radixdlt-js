import {
    includeJSON,
    includeDSON,
    RadixSerializableObject,
    RadixSpunParticle,
    RadixECSignature,
    RadixSerializer,
    RadixAddress,
    RadixSpin,
    RadixParticle,
    RadixParticleGroup,
    RadixHash,
    RadixEUID,
    RadixBytes,
} from '..'


@RadixSerializer.registerClass('TEMPORALVERTEX')
export class RadixTemporalVertex extends RadixSerializableObject {

    @includeJSON
    @includeDSON
    previous: RadixEUID

    @includeJSON
    @includeDSON
    commitment: RadixHash

    @includeJSON
    @includeDSON
    clock: number
    
    @includeJSON
    @includeDSON
    rclock: number

    @includeJSON
    @includeDSON
    owner: RadixBytes

    @includeJSON
    signature: RadixECSignature

    @includeJSON
    @includeDSON
    nids: RadixEUID[]

    @includeJSON
    @includeDSON
    timestamps: {}
}
