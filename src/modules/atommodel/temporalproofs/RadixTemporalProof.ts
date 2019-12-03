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
    public object: RadixHash

    @includeJSON
    @includeDSON
    public vertices: RadixTemporalVertex[]
}
