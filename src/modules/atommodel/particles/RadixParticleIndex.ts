import { RadixSerializableObject, RadixAddress, includeDSON, includeJSON } from '..';

export class RadixParticleIndex extends RadixSerializableObject {
    @includeDSON
    @includeJSON
    public address: RadixAddress

    constructor(address: RadixAddress) {
        super()
        this.address = address
    }
}
