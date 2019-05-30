import { RadixSerializer, RadixParticle, includeDSON, includeJSON, RadixAddress, RadixResourceIdentifier } from '..';

@RadixSerializer.registerClass('radix.particles.rri')
export class RadixRRIParticle extends RadixParticle {

    @includeDSON
    @includeJSON
    public rri: RadixResourceIdentifier

    @includeDSON
    @includeJSON
    public nonce: number

    constructor(
        rri: RadixResourceIdentifier,
    ) {
        super()

        this.rri = rri
        this.nonce = 0
    }

    public getAddresses() {
        return [this.rri.getAddress()]
    }

    public getRRI() {
        return this.rri
    }
}
