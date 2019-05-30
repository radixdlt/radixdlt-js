import { RadixSerializer, includeJSON, includeDSON, RadixParticle, RadixAddress, RadixBytes } from '../..'

/**
 * Particle which can hold arbitrary data
 */
@RadixSerializer.registerClass('radix.particles.message')
export class RadixMessageParticle extends RadixParticle {

    @includeJSON
    @includeDSON
    public from: RadixAddress

    @includeJSON
    @includeDSON
    public to: RadixAddress
    
    @includeDSON
    @includeJSON
    public metaData: {[s: string]: string}

    @includeDSON
    @includeJSON
    public bytes: RadixBytes

    @includeDSON
    @includeJSON
    public nonce: number

    constructor(from: RadixAddress, to: RadixAddress, data: any, metaData: { [s: string]: string }, nonce?: number) {
        super()
        this.from = from
        this.to = to
        this.bytes = new RadixBytes(data)
        this.metaData = metaData
        this.nonce = nonce ? nonce : Date.now()
    }

    public getAddresses() {
        return [this.from, this.to]
    }

    public getData() {
        return this.bytes
    }

    public getMetaData(key: string) {
        const metaData = this.metaData

        if (metaData && key in metaData) {
            return metaData[key]
        }

        return null
    }

    public getNonce() {
        return this.nonce
    }

}
