import { RadixQuark, includeDSON, RadixSerializer, includeJSON, RadixBytes, RadixResourceIdentifier } from '..';

/**
 * A quark that makes a particle type uniquely identifiable: Only one UP particle with a URI
 * (defined by address + particleType + uniqueId) can exist at once.
 */
@RadixSerializer.registerClass('IDENTIFIABLEQUARK')
export class RadixIdentifiableQuark extends RadixQuark {
    
    @includeDSON
    @includeJSON
    public id: RadixResourceIdentifier

    constructor(id: RadixResourceIdentifier) {
        super()
        this.id = id
    }
}
