import { RadixParticleIndex, RadixSerializer, includeDSON, includeJSON, RadixAddress } from '../..';

@RadixSerializer.registerClass('TOKENCLASSREFERENCE')
export class RadixTokenClassReference extends RadixParticleIndex {
    
    @includeDSON
    @includeJSON
    public symbol: string

    constructor(address: RadixAddress, symbol: string) {
        super(address)
        this.symbol = symbol
    }

    public toString() {
        return `${this.address.toString()}/@${this.symbol}`
    }
}
