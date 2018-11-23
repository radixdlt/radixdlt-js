import { RadixQuark, includeDSON, RadixSerializer, includeJSON, RadixBytes } from '../RadixAtomModel';

/**
 * Specifies a uniqueness constraint on an atom. That is, only one atom can
 * contain this particle with this unique quark's byte array contents and its owner.
 */
@RadixSerializer.registerClass('UNIQUEQUARK')
export class RadixUniqueQuark extends RadixQuark {
    
    
    @includeDSON
    @includeJSON
    public unique: RadixBytes

    constructor(unique: Buffer) {
        super()
        this.unique = new RadixBytes(unique)
    }
}
