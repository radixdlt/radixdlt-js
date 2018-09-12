import RadixIdentity from './RadixIdentity';
import { RadixKeyPair } from '../..';
import RadixSimpleIdentity from './RadixSimpleIdentity';
import { TSMap } from 'typescript-map';

export default class RadixIdentityManager {

    public identities: TSMap<string, RadixIdentity> = new TSMap()


    public generateSimpleIdentity() {
        const keyPair = RadixKeyPair.generateNew()
        const identity = new RadixSimpleIdentity(keyPair)
        this.identities.set(keyPair.getAddress(), identity)

        return identity
    }
}
