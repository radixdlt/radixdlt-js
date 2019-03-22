import {
    includeDSON,
    includeJSON,
    RadixParticleIndex,
    RadixSerializer,
    RadixAddress,
    RadixResourceIdentifier,
} from '../..'

@RadixSerializer.registerClass('TOKENDEFINITIONREFERENCE')
export class RadixTokenDefinitionReference extends RadixParticleIndex {    

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
        const rri = RadixResourceIdentifier.fromString(id)
        return new this(rri.address, rri.unique)
    }

    public toString() {
        return `/${this.address.toString()}/tokens/${this.symbol}`
    }

    public equals(other: RadixTokenDefinitionReference) {
        return this.address.equals(other.address) && this.symbol === other.symbol
    }
}
