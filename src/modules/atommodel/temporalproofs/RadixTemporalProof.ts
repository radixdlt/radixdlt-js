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


@RadixSerializer.registerClass('TEMPORALPROOF')
export class RadixTemporalProof extends RadixSerializableObject {

    @includeJSON
    @includeDSON
    object: RadixHash

    @includeJSON
    @includeDSON
    vertices: RadixTemporalVertex[]
}
