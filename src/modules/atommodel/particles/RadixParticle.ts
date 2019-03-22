import { RadixSerializableObject, RadixSerializer, includeJSON, includeDSON, RadixAddress } from '..'

@RadixSerializer.registerClass('PARTICLE')
export class RadixParticle extends RadixSerializableObject {


    constructor() {
        super()
    }

    public getAddresses(): RadixAddress[] {
        throw new Error('Particle implementations must override this method!')
    }
}
