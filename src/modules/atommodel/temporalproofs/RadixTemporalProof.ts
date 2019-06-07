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
    RadixTemporalVertex,
} from '..'


@RadixSerializer.registerClass('tempo.temporal_proof')
export class RadixTemporalProof extends RadixSerializableObject {

    @includeJSON
    @includeDSON
    object: RadixHash

    @includeJSON
    @includeDSON
    vertices: RadixTemporalVertex[]
}
