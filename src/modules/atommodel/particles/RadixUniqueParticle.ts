import { RadixSerializer, RadixParticle, includeDSON, includeJSON, RadixAddress, RRI } from '..'

@RadixSerializer.registerClass('radix.particles.unique')
export class RadixUniqueParticle extends RadixParticle {

    @includeDSON
    @includeJSON
    public name: string

    @includeDSON
    @includeJSON
    public address: RadixAddress

    @includeDSON
    @includeJSON
    public nonce: number

    constructor(
        address: RadixAddress,
        unique: string,
        nonce?: number,
    ) {
        super()

        this.address = address
        this.name = unique
        this.nonce = nonce ? nonce : Date.now()
    }

    public getAddresses() {
        return [this.address]
    }

    public getRRI() {
        return new RRI(this.address, this.name)
    }
}
