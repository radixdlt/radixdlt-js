import { RadixQuark, includeDSON, RadixAddress, RadixSerializer, includeJSON } from '..';

/**
 *  A quark which gives it's containing particle the property that it is something to be
 *  stored in a shardable account
 */
@RadixSerializer.registerClass('ACCOUNTABLEQUARK')
export class RadixAccountableQuark extends RadixQuark {
    
    @includeDSON
    @includeJSON
    public addresses: RadixAddress[]

    constructor(addresses: RadixAddress[]) {
        super()
        this.addresses = addresses
    }

}
