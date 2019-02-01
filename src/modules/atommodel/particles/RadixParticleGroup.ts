import {
    includeDSON,
    includeJSON,
    RadixSerializableObject,
    RadixSpin,
    RadixAddress,
    RadixSpunParticle,
    RadixParticle,
    RadixTimestampParticle,
    RadixSerializer,
} from '..'

import { TSMap } from 'typescript-map'

@RadixSerializer.registerClass('PARTICLEGROUP')
export class RadixParticleGroup extends RadixSerializableObject {

    @includeDSON
    @includeJSON
    public particles: RadixSpunParticle[]

}
