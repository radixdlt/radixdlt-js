import { RadixSerializer, includeJSON, includeDSON, RadixParticle, RadixAddress, RadixAccountableQuark, RadixBytes } from '../..'

/**
 * Particle which can hold arbitrary data
 */
@RadixSerializer.registerClass('MESSAGEPARTICLE')
export class RadixMessageParticle extends RadixParticle {

    @includeJSON
    @includeDSON
    public from: RadixAddress
    
    @includeDSON
    @includeJSON
    public metaData: {[s: string]: string}

    @includeDSON
    @includeJSON
    public bytes: RadixBytes

    constructor(from: RadixAddress, data: any, metaData: { [s: string]: string }, addresses: RadixAddress[]) {
        super(new RadixAccountableQuark(addresses))
        this.from = from
        this.bytes = new RadixBytes(data)
        this.metaData = metaData
    }

    public getAddresses() {
        return this.getQuarkOrError(RadixAccountableQuark).addresses
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
