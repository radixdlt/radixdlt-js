import { RadixSerializableObject, RadixSpunParticle, RadixECSignature, RadixSerializer, includeJSON, includeDSON, RadixAddress, RadixSpin } from '..';
import { TSMap } from 'typescript-map';

@RadixSerializer.registerClass('ATOM')
export class RadixAtom extends RadixSerializableObject {

    @includeJSON @includeDSON
    public particles: RadixSpunParticle[]

    @includeJSON
    public signatures: { [id: string]: RadixECSignature }


    public getAddresses() {
        const addressMap = new TSMap<RadixAddress, any>()

        for (const particle of this.particles) {
            const addresses = particle.particle.getAddresses()
            for (const address of addresses) {
                addressMap.set(address, '')
            }
        }

        return addressMap.keys()
    }

    public getParticles(spin: RadixSpin) {
        this.particles.filter(spunParticle => spunParticle.spin === spin)
            .map(spunParticle => spunParticle.particle)
    }
}
