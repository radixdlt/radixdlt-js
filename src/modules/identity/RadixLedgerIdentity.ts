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
import App, { LedgerApp } from '../hardwarewallet/LedgerApp'
import { openConnection } from '../hardwarewallet/HWWallet'

export default class RadixLedgerIdentity extends RadixIdentity {
    public account: RadixAccount
    private App: LedgerApp

    private constructor(account: RadixAccount, app: LedgerApp) {
        super(account.address)
        this.account = account
        this.App = app
    }

    public static async createNew(): Promise<RadixLedgerIdentity> {
        const device = await openConnection()
        const app = App(device)

        const response = await app.getPublicKey()
        const address = RadixAddress.fromPublic(response.publicKey)
        const account = new RadixAccount(address)

        const identity = new RadixLedgerIdentity(account, app)
        account.enableDecryption(identity)
        return identity
    }

    public async signAtom(atom: RadixAtom): Promise<RadixAtom> {
        return await this.App.signAtom(atom, this.account.address)
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

    public getDeviceInfo() {
        return this.App.getDeviceInfo()
    }
}