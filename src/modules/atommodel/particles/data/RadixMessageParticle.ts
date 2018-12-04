import { RadixSerializer, includeJSON, includeDSON, RadixParticle, RadixAddress, RadixAccountableQuark, RadixDataQuark } from '../..'

/**
 * Particle which can hold arbitrary data
 */
@RadixSerializer.registerClass('MESSAGEPARTICLE')
export class RadixMessageParticle extends RadixParticle {

    @includeJSON
    @includeDSON
    public from: RadixAddress

    constructor(from: RadixAddress, data: string | Buffer, metaData: {[s: string]: string}, addresses: RadixAddress[]) {
        super(new RadixAccountableQuark(addresses), new RadixDataQuark(data, metaData))
        this.from = from
    }

    public getAddresses() {
        return this.getQuarkOrError(RadixAccountableQuark).addresses
    }

    public getData() {
        return this.getQuarkOrError(RadixDataQuark).bytes
    }

    public getMetaData(key: string) {
        const metaData = this.getQuarkOrError(RadixDataQuark).metaData

        if (key in metaData) {
            return metaData[key]
        }
        
        return null
    }

}
