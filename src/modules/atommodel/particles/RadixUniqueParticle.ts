import { RadixSerializer, RadixParticle, includeDSON, includeJSON, RadixAddress, RadixResourceIdentifier } from '..';

@RadixSerializer.registerClass('UNIQUEIDPARTICLE')
export class RadixTokenClassParticle extends RadixParticle {

    @includeDSON
    @includeJSON
    public name: string

    @includeDSON
    @includeJSON
    public address: RadixAddress

    constructor(
        address: RadixAddress,
        unique: string,
    ) {
        super()

        this.address = address
        this.name = unique
    }

    public getAddresses() {
        return [this.address]
    }

    public getRRI() {
        return new RadixResourceIdentifier(this.address, 'unique', this.name)
    }
}
