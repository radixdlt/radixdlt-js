import { RadixQuark, includeDSON, RadixSerializer, includeJSON, RadixBytes, RadixParticleIndex } from '../RadixAtomModel';


/**
 * A quark that makes a particle non fungible: only one particle with a given ID of its type can exist.
 */
@RadixSerializer.registerClass('NONFUNGIBLEQUARK')
export class RadixNonFungibleQuark extends RadixQuark {
    
    @includeDSON
    @includeJSON
    public index: RadixParticleIndex

    constructor(index: RadixParticleIndex) {
        super()
        this.index = index
    }
}
