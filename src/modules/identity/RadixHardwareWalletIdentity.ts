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

import { RadixAccount, RadixIdentity, RadixECIES } from '../..'
import { RadixAddress, RadixAtom } from '../atommodel'
import { sleep } from '../common/RadixUtil'

interface App {
    getPublicKey(bip44: string, p1?: number, p2?: number): Promise<{ publicKey: Buffer }>
    signAtom(bip44: string, atom: RadixAtom): Promise<RadixAtom>
    signHash(bip44: string, hash: Buffer): Promise<{ signature: Buffer }>
}

export default class RadixHardwareWalletIdentity extends RadixIdentity {
    public account: RadixAccount
    private app: App
    private bip44: string

    private constructor(account: RadixAccount, app: App, bip44: string) {
        super(account.address)
        this.account = account
        this.app = app
        this.bip44 = bip44
    }

    public static async createNew(app: App, bip44: string): Promise<RadixHardwareWalletIdentity> {
        let response

        // Retry if Radix app is not open
        while (!response) {
            try {
                response = await app.getPublicKey(bip44)
            } catch (e) {
                await sleep(500)
            }
        }

        const address = RadixAddress.fromPublic(response.publicKey)
        const account = new RadixAccount(address)

        const identity = new RadixHardwareWalletIdentity(account, app, bip44)
        account.enableDecryption(identity)
        return identity
    }

    public async signAtom(atom: RadixAtom): Promise<RadixAtom> {
        return this.app.signAtom(this.bip44, atom)
    }

    public async signAtomHash(atom: RadixAtom): Promise<any> {
        const response = await this.app.signHash(this.bip44, atom.getHash())
        return response.signature
    }


    public async decryptECIESPayload(payload: Buffer) {
        // TODO
        return Buffer.alloc(0)
    }

    public async decryptECIESPayloadWithProtectors(
        protectors: Buffer[],
        payload: Buffer,
    ) {
        // TODO
        return Buffer.alloc(0)
    }

    public getPublicKey() {
        return this.address.getPublic()
    }
}
