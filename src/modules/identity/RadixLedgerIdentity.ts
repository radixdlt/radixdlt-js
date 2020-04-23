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

import { RadixAccount, RadixIdentity } from '../..'
import { RadixAddress, RadixAtom } from '../atommodel'
import { getPublicKey, signAtom, signHash, getDeviceInfo } from '../hardwarewallet/LedgerApp'
import { sleep } from '../common/RadixUtil'

export default class RadixLedgerIdentity extends RadixIdentity {
    public account: RadixAccount

    private constructor(account: RadixAccount) {
        super(account.address)
        this.account = account
    }

    public static async createNew(): Promise<RadixLedgerIdentity> {
        let response

        // Retry if Radix app is not open
        while (!response) {
            try {
                response = await getPublicKey()
            } catch (e) {
                await sleep(1000)
            }
        }

        const address = RadixAddress.fromPublic(response.publicKey)
        const account = new RadixAccount(address)

        const identity = new RadixLedgerIdentity(account)
        account.enableDecryption(identity)
        return identity
    }

    public async signAtom(atom: RadixAtom): Promise<RadixAtom> {
        return await signAtom(atom, this.account.address)
    }

    public async signAtomHash(atom: RadixAtom): Promise<any> {
        const response = await signHash(atom.getHash())
        return response.signature
    }


    public async decryptECIESPayload(payload: Buffer) {
        return Buffer.from('')
    }

    public async decryptECIESPayloadWithProtectors(
        protectors: Buffer[],
        payload: Buffer,
    ) {
        // TODO
        return Buffer.from('')
    }

    public getPublicKey() {
        return this.address.getPublic()
    }

    public async getDeviceInfo() {
        return await getDeviceInfo()
    }
}