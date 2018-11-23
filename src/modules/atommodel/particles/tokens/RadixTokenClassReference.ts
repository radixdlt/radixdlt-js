import { RadixParticleIndex, RadixSerializer, includeDSON, includeJSON, RadixAddress } from '../../RadixAtomModel';

@RadixSerializer.registerClass('TOKENCLASSREFERENCE')
export class RadixTokenClassReference extends RadixParticleIndex {
    
    @includeDSON
    @includeJSON
    public symbol: string

    constructor(address: RadixAddress, symbol: string) {
        super()
        this.address = address
        this.symbol = symbol
    }

    public toString() {
        return `${this.address.toString()}/@${this.symbol}`
    }
}
