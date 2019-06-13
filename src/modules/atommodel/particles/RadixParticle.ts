import { RadixSerializableObject, RadixSerializer, includeJSON, includeDSON, RadixAddress, RadixEUID } from '..'
import { StringifySet } from '../../common/StringifySet'

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

    public getDestinations() {
        return StringifySet.of(this.getAddresses().map(a => a.getUID())).values()
    }

    @includeJSON
    @includeDSON
    get destinations() {
        return this.getDestinations()
    }

    set destinations(destinations: RadixEUID[]) {
        // Ignore, since it's a computed property
    }
}
