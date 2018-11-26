import { TSMap } from 'typescript-map'

import RadixIdentity from './RadixIdentity'
import RadixSimpleIdentity from './RadixSimpleIdentity'
import RadixRemoteIdentity from './RadixRemoteIdentity'

import { RadixKeyPair } from '../RadixAtomModel'

export default class RadixIdentityManager {
    public identities: TSMap<string, RadixIdentity> = new TSMap()

    /**
     * Generates a new RadixSimpleIdentity
     * 
     * @param keyPair - The key pair of the identity
     * @returns An instance of a RadixSimpleIdentity
     */
    public generateSimpleIdentity(): RadixIdentity {
        const keyPair = RadixKeyPair.generateNew()
        const identity = new RadixSimpleIdentity(keyPair)

        this.identities.set(keyPair.getAddress(), identity)

        return identity
    }

    /**
     * Adds a new RadixSimpleIdentity
     * 
     * @param keyPair - The key pair of the identity
     * @returns An instance of a RadixSimpleIdentity
     */
    public addSimpleIdentity(keyPair: RadixKeyPair): RadixIdentity {
        const identity = new RadixSimpleIdentity(keyPair)

        this.identities.set(keyPair.getAddress(), identity)

        return identity
    }

    /**
     * Generates a new RadixRemoteIdentity
     * 
     * @param name - The name of the application that wants to use the remote identity
     * @param description - The description of the application that wants to use the remote identity
     * @param [host] - The host of the wallet
     * @param [port] - The port in which the wallet server is being exposed
     * @returns A promise with an instance of a RadixRemoteIdentity
     */
    public async generateRemoteIdentity(name: string, description: string, host = 'localhost', port = '54345'): Promise<RadixIdentity> {
        return RadixRemoteIdentity.createNew(name, description)
    }

    /**
     * Adds a new RadixRemoteIdentity
     * 
     * @param name - The name of the application that wants to use the remote identity
     * @param description - The description of the application that wants to use the remote identity
     * @param [host] - The host of the wallet
     * @param [port] - The port in which the wallet server is being exposed
     * @returns A promise with an instance of a RadixRemoteIdentity 
     */
    public async addRemoteIdentity(name: string, description: string, host = 'localhost', port = '54345'): Promise<RadixIdentity> {
        const identity = await RadixRemoteIdentity.createNew(name, description)

        this.identities.set(RadixKeyPair.fromPublic(identity.getPublicKey()).getAddress(), identity)

        return identity
    }
}
