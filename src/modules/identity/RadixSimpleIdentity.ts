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
import RadixIdentity, { setupIdentityAccount } from './RadixIdentity'

import { RadixAtom, RadixAddress } from '../atommodel'
import { RadixAccount } from '../..'

export default class RadixSimpleIdentity implements RadixIdentity {
    public account: RadixAccount

    constructor(readonly address: RadixAddress) {
        this.account = setupIdentityAccount.bind(this)(address)
    }

    public static fromPrivate(privateKey: string | Buffer) {
        return new this(RadixAddress.fromPrivate(privateKey))
    }

    public async signAtom(atom: RadixAtom) {
        const signature = this.address.sign(atom.getHash())
        const signatureId = this.address.getUID()

        atom.signatures = { [signatureId.toString()]: signature }

        return atom
    }

    public async decryptECIESPayload(payload: Buffer) {
        return RadixECIES.decrypt(this.address.getPrivate(), payload)
    }

    public async decryptECIESPayloadWithProtectors(protectors: Buffer[], payload: Buffer) {
        return RadixECIES.decryptWithProtectors(this.address.getPrivate(), protectors, payload)
    }

    public getPublicKey() {
        return this.address.getPublic()
    }
}
