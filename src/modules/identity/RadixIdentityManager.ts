/*
 * (C) Copyright 2020 Radix DLT Ltd
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the “Software”),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

import { TSMap } from 'typescript-map'

import RadixIdentity from './RadixIdentity'
import RadixSimpleIdentity from './RadixSimpleIdentity'
import RadixRemoteIdentity from './RadixRemoteIdentity'
import { RadixAddress } from '../atommodel';
import { radixHash } from '../common/RadixUtil';
import { RadixLedgerIdentity } from '../..';

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
     * Generates a new RadixSimpleIdentity from an arbitrary byte buffer.
     *
     * @param seed Buffer seed for the address of the identity
     * @returns An instance of a RadixSimpleIdentity
     */
    public generateSimpleIdentityFromSeed(seed: Buffer): RadixIdentity {
        const hash = radixHash(seed)
        const address = RadixAddress.fromPrivate(hash)
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
    public async generateRemoteIdentity(
        name: string,
        description: string,
        permissions: string[],
        host: string,
        port: string): Promise<RadixIdentity> {
        try {
            return await RadixRemoteIdentity.createNew(name, description, permissions, host, port)
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
