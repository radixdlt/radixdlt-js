import RadixECIES from '../crypto/RadixECIES'
import RadixIdentity from './RadixIdentity'
import RadixAccount from '../account/RadixAccount'
import RadixSignature from '../atom/RadixSignature'
import RadixSerializer from '../serializer/RadixSerializer'

import { RadixAtom, RadixKeyPair } from '../RadixAtomModel'

export default class RadixRemoteIdentity extends RadixIdentity {
    private TOKEN: string
    private REMOTE_URL: string

    constructor(readonly keyPair: RadixKeyPair, token, host = 'localhost', port = '54345') {
        super(keyPair)

        this.TOKEN = token
        this.REMOTE_URL = `ws://${host}:${port}`
    }

    public signAtom(atom: RadixAtom) {
        return new Promise<RadixAtom>((resolve, reject) => {
            const _socket = new WebSocket(this.REMOTE_URL)

            _socket.onopen = () => {
                _socket.send(JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'sign_atom',
                    params: { 
                        token: this.TOKEN,
                        atom: atom.toJson(),
                    },
                    id: 0,
                }))
                _socket.onmessage = (evt) => resolve(RadixSerializer.fromJson(JSON.parse(evt.data).result))
                _socket.onerror = (error) => reject(`WebSocket Error: ${JSON.stringify(error)}`)
            }
        })
    }

    public decryptECIESPayload(payload: Buffer) {
        return new Promise<Buffer>((resolve, reject) => {
            const _socket = new WebSocket(this.REMOTE_URL)

            _socket.onopen = () => {
                _socket.send(JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'decrypt_ecies_payload',
                    params: {
                        token: this.TOKEN,
                        payload,
                    },
                    id: 0,
                }))
                _socket.onmessage = (evt) => {
                    const result = JSON.parse(evt.data).result
                    if (result && result.data) {
                        resolve(result.data)
                    } else {
                        reject(result)
                    }
                }
                _socket.onerror = (error) => reject(`WebSocket Error: ${JSON.stringify(error)}`)
            }
        })
    }

    public async getPublicKey() {
        return Buffer.from(this.keyPair.keyPair.getPublic().encode('be', true))
    }

    public static register(name: string, description: string, host = 'localhost', port = '54345') {
        return new Promise<Buffer>((resolve, reject) => {
            const _socket = new WebSocket(`ws:${host}:${port}`)
            
            _socket.onopen = () => {
                _socket.send(JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'register',
                    params: {
                        name,
                        description,
                        permissions: ['sign_atom', 'decrypt_ecies_payload'],
                    },
                    id: 0,
                }))
                _socket.onmessage = (evt) => resolve(JSON.parse(evt.data).result)
                _socket.onerror = (error) => reject(`WebSocket Error: ${JSON.stringify(error)}`)
            }
        })
    }
    public static getRemotePublicKey(host = 'localhost', port = '54345') {
        return new Promise<Buffer>((resolve, reject) => {
            const _socket = new WebSocket(`ws:${host}:${port}`)
            
            _socket.onopen = () => {
                _socket.send(JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'get_public_key',
                    params: [],
                    id: 0,
                }))
                _socket.onmessage = (evt) => resolve(JSON.parse(evt.data).result.data)
                _socket.onerror = (error) => reject(`WebSocket Error: ${JSON.stringify(error)}`)
            }
        })
    }
}
