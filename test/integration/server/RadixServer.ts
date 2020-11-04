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

import WebSocket from 'ws'

import AuthSystem from './AuthSystem'
import JsonRpcServer from './JsonRpcServer'

import {
    radixTokenManager,
    RadixIdentity,
    RadixTransactionBuilder,
    RadixAccount,
    RadixTransactionUpdate,
    RadixECIES,
    RadixAtom,
    RadixSerializer,
    RadixIdentityManager,
} from '../../../src/index'

import * as jsonrpc from 'jsonrpc-lite'

export default class RadixServer {

    private identityManager: RadixIdentityManager
    private identity: RadixIdentity

    constructor() {
        this.identityManager = RadixIdentityManager.byCreatingNewIdentity()
        this.identity = this.identityManager.generateSimpleIdentity()
    }

    public start() {
        const rpcServer = new JsonRpcServer(new WebSocket.Server({ port: 54346 }))

        rpcServer.register('register', async (params, ws) => {
            const token = await AuthSystem.register(params)

            return { token }
        })

        rpcServer.register('sign_atom', async (params, ws) => {
            await AuthSystem.authenticate(params.token, ['sign_atom'])

            const atom: RadixAtom = RadixSerializer.fromJSON(params.atom)

            return RadixSerializer.toJSON((await this.identity.signAtom(atom)).signatures)
        })

        rpcServer.register('decrypt_ecies_payload', async (params, ws) => {
            await AuthSystem.authenticate(params.token, ['decrypt_ecies_payload'])

            return this.identity.decryptECIESPayload(Buffer.from(params.payload))
        })

        rpcServer.register('decrypt_ecies_payload_with_protectors', async (params, ws) => {
            await AuthSystem.authenticate(params.token, ['decrypt_ecies_payload'])

            const protectors = params.protectors.map(p => Buffer.from(p))

            return this.identity.decryptECIESPayloadWithProtectors(protectors, Buffer.from(params.payload))
        })

        rpcServer.register('get_public_key', async (params, ws) => {
            await AuthSystem.authenticate(params.token, ['get_public_key'])

            return this.identity.getPublicKey()
        })
    }
}
