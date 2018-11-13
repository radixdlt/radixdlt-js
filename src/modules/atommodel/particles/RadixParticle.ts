import { RadixSerializableObject, RadixQuark, RadixSerializer, includeJSON, includeDSON } from '../RadixAtomModel'

@RadixSerializer.registerClass('PARTICLE')
export class RadixParticle extends RadixSerializableObject {

    @includeJSON @includeDSON
    public quarks: RadixQuark[] = []

}
