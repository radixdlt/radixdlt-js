import { RadixSerializableObject, RadixAddress, includeDSON, includeJSON } from '..'

export class RadixParticleIndex extends RadixSerializableObject {
    
    @includeDSON
    @includeJSON
    public address: RadixAddress

    @includeDSON
    @includeJSON
    public unique: string

    constructor(address: RadixAddress, unique: string) {
        super()
        this.address = address
        this.unique = unique
    }
}
