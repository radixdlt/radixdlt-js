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

export interface Class<T> {
    new(...args: any[]): T
}

import RadixSimpleIdentity from './RadixSimpleIdentity'
import { radixHash } from '../common/RadixUtil'
import PrivateKey from '../crypto/PrivateKey'
import RadixIdentity from './RadixIdentity'

type IdentityIdentifier = string
export default class RadixIdentityManager {
    public identities: TSMap<IdentityIdentifier, RadixIdentity> = new TSMap()
    private identifierForActiveAccount: IdentityIdentifier

    constructor(activeIdentity: RadixIdentity) {
        this.identifierForActiveAccount = activeIdentity.getIdentityIdentifier()
        this.addIdentity(activeIdentity)
    }

    public getActiveIdentity(): RadixIdentity {
        return this.identities[this.identifierForActiveAccount]
    }

    public static byCreatingNewIdentity(ofType: Class<RadixIdentity> = RadixSimpleIdentity): RadixIdentityManager {

        return new RadixIdentityManager(RadixSimpleIdentity.generateNew())
    }


    /**
     * Generates a new random RadixSimpleIdentity
     * @returns An instance of a RadixSimpleIdentity
     */
    public generateSimpleIdentity(): RadixSimpleIdentity {
        const simpleIdentity = RadixSimpleIdentity.generateNew()
        this.addIdentity(simpleIdentity)
        return simpleIdentity
    }

    /**
     * Generates a new RadixSimpleIdentity from an arbitrary byte buffer.
     *
     * @param seed Buffer seed for the address of the identity
     * @param magicByte Magic byte of the universe
     * @returns An instance of a RadixSimpleIdentity
     */
    public generateSimpleIdentityFromSeed(
        seed: Buffer,
        magicByte: number,
    ): RadixIdentity {
        const privateKeySeed = radixHash(seed)
        return this.addIdentity(
            RadixSimpleIdentity.fromPrivate(PrivateKey.from(privateKeySeed)),
        )
    }
    /**
     * Adds a new RadixIdentity to the set of available identities
     *
     * @returns A RadixIdentity
     */
    public addIdentity(identity: RadixIdentity): RadixIdentity {
        this.identities.set(identity.getIdentityIdentifier(), identity)
        return identity
    }
}
