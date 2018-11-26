import { TSMap } from 'typescript-map'

import RadixIdentity from './RadixIdentity'
import RadixSimpleIdentity from './RadixSimpleIdentity'
import RadixRemoteIdentity from './RadixRemoteIdentity'

import { RadixKeyPair } from '../RadixAtomModel'

export default class RadixIdentityManager {
    public identities: TSMap<string, RadixIdentity> = new TSMap()

    public generateSimpleIdentity(): RadixIdentity {
        const keyPair = RadixKeyPair.generateNew()
        const identity = new RadixSimpleIdentity(keyPair)

        this.identities.set(keyPair.getAddress(), identity)

        return identity
    }

    public addSimpleIdentity(keyPair: RadixKeyPair): RadixIdentity {
        const identity = new RadixSimpleIdentity(keyPair)

        this.identities.set(keyPair.getAddress(), identity)

        return identity
    }

    public async generateRemoteIdentity(name: string, description: string, host = 'localhost', port = '54345'): Promise<RadixIdentity> {
        const identity = await RadixRemoteIdentity.createNew(name, description)

        return identity
    }

    public async addRemoteIdentity(name: string, description: string, host = 'localhost', port = '54345'): Promise<RadixIdentity> {
        const identity = await RadixRemoteIdentity.createNew(name, description)

        this.identities.set(RadixKeyPair.fromPublic(identity.getPublicKey()).getAddress(), identy)

        return identity
    }
}
