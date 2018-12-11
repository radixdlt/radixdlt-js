import { RadixParticleIndex, RadixSerializer, includeDSON, includeJSON, RadixAddress } from '../..';

@RadixSerializer.registerClass('TOKENCLASSREFERENCE')
export class RadixTokenClassReference extends RadixParticleIndex {    

    constructor(address: RadixAddress, symbol: string) {
        super(address, symbol)
    }

    public get symbol() {
        return this.unique
    }

    public set symbol(value: string) {
        this.unique = value
    }

    public static fromString(id: string) {
        const address = id.slice(0, id.indexOf('/@'))
        const symbol = id.slice(id.indexOf('/@') + 2)
        return new this(RadixAddress.fromAddress(address), symbol)
    }

    public toString() {
        return `${this.address.toString()}/@${this.symbol}`
    }

    public equals(other: RadixTokenClassReference) {
        return this.address.equals(other.address) && this.symbol === other.symbol
    }
}
