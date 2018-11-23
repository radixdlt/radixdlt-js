import { RadixSerializableObject, RadixAddress, includeDSON, includeJSON } from '../RadixAtomModel';

export class RadixParticleIndex extends RadixSerializableObject {
    @includeDSON
    @includeJSON
    public address: RadixAddress
}
