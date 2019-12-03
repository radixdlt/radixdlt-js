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


@RadixSerializer.registerClass('tempo.temporal_vertex')
export class RadixTemporalVertex extends RadixSerializableObject {

    @includeJSON
    @includeDSON
    public previous: RadixEUID

    @includeJSON
    @includeDSON
    public commitment: RadixHash

    @includeJSON
    @includeDSON
    public clock: number
    
    @includeJSON
    @includeDSON
    public rclock: number

    @includeJSON
    @includeDSON
    public owner: RadixBytes

    @includeJSON
    public signature: RadixECSignature

    @includeJSON
    @includeDSON
    public nids: RadixEUID[]

    @includeJSON
    @includeDSON
    public timestamps: {}
}
