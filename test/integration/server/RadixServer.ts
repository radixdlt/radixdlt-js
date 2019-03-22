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
        this.identityManager = new RadixIdentityManager()
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
