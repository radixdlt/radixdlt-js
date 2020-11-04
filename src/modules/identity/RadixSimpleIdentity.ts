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

import RadixECIES from '../crypto/RadixECIES'
import RadixIdentity from './RadixIdentity'

import { RadixAtom, RadixAddress, RadixEUID } from '../atommodel'
import PrivateKey from '../crypto/PrivateKey'
import KeyPair from '../crypto/KeyPair'
import PublicKey from '../crypto/PublicKey'
import BN from 'bn.js'

export type SignatureID = RadixEUID

export default class RadixSimpleIdentity implements RadixIdentity {

    public readonly keyPair: KeyPair

    constructor(privateKey: PrivateKey) {
        this.keyPair = KeyPair.fromPrivateKey(privateKey)
    }

    public static generateNew(): RadixSimpleIdentity {
        return this.fromPrivate(PrivateKey.generateNew())
    }

    public static fromPrivate(privateKey: PrivateKey | Buffer | string | BN | number) {
        return new this(PrivateKey.from(privateKey))
    }

    public privateKey(): PrivateKey {
        return this.keyPair.privateKey
    }

    public async signAtom(atom: RadixAtom) {
        const signature = this.privateKey().sign(atom.getHash())
        const signatureId = this.idForSignature()

        atom.signatures = { [signatureId.toString()]: signature }

        return atom
    }

    public async decryptECIESPayload(payload: Buffer) {
        return RadixECIES.decrypt(this.privateKey(), payload)
    }

    public async decryptECIESPayloadWithProtectors(protectors: Buffer[], payload: Buffer) {
        return RadixECIES.decryptWithProtectors(
            this.privateKey(),
            protectors,
            payload,
        )
    }

    public getPublicKey(): PublicKey {
        return this.keyPair.publicKey
    }


    public idForSignature(): SignatureID {
        return this.getPublicKey().getUID()
    }

    public asyncGetPublicKey(): Promise<PublicKey> {
        return new Promise<PublicKey>((resolve, _) => {
            resolve(this.getPublicKey())
        })
    }


    public getIdentityIdentifier(): string {
        return this.idForSignature().toString()
    }
}

