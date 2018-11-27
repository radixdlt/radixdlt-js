import { TSMap } from 'typescript-map'

import RadixIdentity from './RadixIdentity'
import RadixSimpleIdentity from './RadixSimpleIdentity'
import RadixRemoteIdentity from './RadixRemoteIdentity'
import { RadixAddress } from '../atommodel';

export default class RadixIdentityManager {
    public identities: TSMap<string, RadixIdentity> = new TSMap()

    /**
     * Generates a new random RadixSimpleIdentity
     * 
     * @returns An instance of a RadixSimpleIdentity
     */
    public generateSimpleIdentity(): RadixIdentity {
        const address = RadixAddress.generateNew()
        const identity = new RadixSimpleIdentity(address)

        this.identities.set(address.getAddress(), identity)

        return identity
    }

    /**
     * Adds a new RadixSimpleIdentity
     * 
     * @param address - The key pair of the identity(must have a private key)
     * @returns An instance of a RadixSimpleIdentity
     */
    public addSimpleIdentity(address: RadixAddress): RadixIdentity {
        const identity = new RadixSimpleIdentity(address)

        this.identities.set(address.getAddress(), identity)

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
        try {
            return RadixRemoteIdentity.createNew(name, description)
        } catch (error) {
            throw error
        }
    }

    /**
     * Adds a new RadixIdentity to the set of available identities
     * 
     * @returns A RadixIdentity
     */
    public addIdentity(identity: RadixIdentity): RadixIdentity {
        this.identities.set(identity.account.getAddress(), identity)

        return identity
    }
}
