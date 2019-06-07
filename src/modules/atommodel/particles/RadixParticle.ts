import { RadixSerializableObject, RadixSerializer, includeJSON, includeDSON, RadixAddress, RadixEUID } from '..'

@RadixSerializer.registerClass('radix.particle')
export class RadixParticle extends RadixSerializableObject {


    constructor() {
        super()
    }

    public getAddresses(): RadixAddress[] {
        throw new Error('Particle implementations must override this method!')
    }

    public getHid() {
        return new RadixEUID(this.getHash().slice(0, 16))
    }

    public getHidString() {
        return this.getHid().toString()
    }
}
