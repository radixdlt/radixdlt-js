import { RadixSerializer, includeJSON, includeDSON, RadixParticle, RadixAddress, RadixBytes } from '../..'

/**
 * Particle which can hold arbitrary data
 */
@RadixSerializer.registerClass('MESSAGEPARTICLE')
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

    constructor(from: RadixAddress, to: RadixAddress, data: any, metaData: { [s: string]: string }) {
        super()
        this.from = from
        this.to = to
        this.bytes = new RadixBytes(data)
        this.metaData = metaData
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

}
