import { RadixSerializableObject, RadixSpunParticle, RadixECSignature, RadixSerializer, includeJSON, includeDSON } from '../RadixAtomModel';

@RadixSerializer.registerClass('ATOM')
export class RadixAtom extends RadixSerializableObject {

    @includeJSON @includeDSON
    public particles: RadixSpunParticle[]

    @includeJSON
    public signatures: { [id: string]: RadixECSignature }
}
