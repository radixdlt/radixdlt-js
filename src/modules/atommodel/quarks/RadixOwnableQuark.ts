import { RadixQuark, includeDSON, RadixSerializer, includeJSON, RadixBytes } from '..';

/**
 * A quark that protects a particle from being spun DOWN unless it was signed by the owner
 */
@RadixSerializer.registerClass('OWNABLEQUARK')
export class RadixOwnableQuark extends RadixQuark {
    
    
    @includeDSON
    @includeJSON
    /**
     * Public key of the owner
     */
    public owner: RadixBytes

    constructor(owner: Buffer) {
        super()
        this.owner = new RadixBytes(owner)
    }
}
