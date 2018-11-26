import RadixECIES from '../crypto/RadixECIES'
import RadixIdentity from './RadixIdentity'
import RadixAccount from '../account/RadixAccount'
import RadixSignature from '../atom/RadixSignature'
import RadixSerializer from '../serializer/RadixSerializer'

import { RadixAtom, RadixKeyPair } from '../RadixAtomModel'

export default class RadixRemoteIdentity extends RadixIdentity {
    private token: string
    private remoteUrl: string

    private signAtomSocket: WebSocket
    private descryptECIESPayloadSocket: WebSocket

    private constructor(readonly keyPair: RadixKeyPair, token: string, remoteUrl: string) {
        super(keyPair)

        this.token = token
        this.remoteUrl = remoteUrl
    }

    private getSocketConnection(_socket: WebSocket) {
        if (!_socket || _socket.readyState === _socket.CLOSING || _socket.readyState === _socket.CLOSED) {
            _socket = new WebSocket(this.remoteUrl)
        }
        return _socket
    }

    public signAtom(atom: RadixAtom) {
        return new Promise<RadixAtom>((resolve, reject) => {
            const socket = this.getSocketConnection(this.signAtomSocket)

            socket.onopen = () => {
                socket.send(JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'sign_atom',
                    params: { 
                        token: this.token,
                        atom: atom.toJson(),
                    },
                    id: 0,
                }))
                socket.onmessage = (evt) => resolve(RadixSerializer.fromJson(JSON.parse(evt.data).result))
                socket.onerror = (error) => reject(`Error: ${JSON.stringify(error)}`)
            }
        })
    }

    public decryptECIESPayload(payload: Buffer) {
        return new Promise<Buffer>((resolve, reject) => {
            const socket = this.getSocketConnection(this.descryptECIESPayloadSocket)

            socket.onopen = () => {
                socket.send(JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'decrypt_ecies_payload',
                    params: {
                        token: this.token,
                        payload,
                    },
                    id: 0,
                }))
                socket.onmessage = (evt) => {
                    const result = JSON.parse(evt.data).result
                    if (result && result.data) {
                        resolve(result.data)
                    } else {
                        reject(result)
                    }
                }
                socket.onerror = (error) => reject(`Error: ${JSON.stringify(error)}`)
            }
        })
    }

    public getPublicKey() {
        return Buffer.from(this.keyPair.keyPair.getPublic().encode('be', true))
    }

    public static async createNew(name: string, description: string, host = 'localhost', port = '54345') {
        const publicKey = await RadixRemoteIdentity.getRemotePublicKey(host, port)
        const token = await RadixRemoteIdentity.register(name, description, host, port)

        return new RadixRemoteIdentity(RadixKeyPair.fromPublic(publicKey), token, `ws:${host}:${port}`)
    }

    public static register(name: string, description: string, host = 'localhost', port = '54345') {
        return new Promise<string>((resolve, reject) => {
            // This is an independant websocket because 'register' is a static method
            const socket = new WebSocket(`ws:${host}:${port}`)
            
            socket.onopen = () => {
                socket.send(JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'register',
                    params: {
                        name,
                        description,
                        permissions: ['sign_atom', 'decrypt_ecies_payload'],
                    },
                    id: 0,
                }))
                socket.onmessage = (evt) => resolve(JSON.parse(evt.data).result.token)
                socket.onerror = (error) => reject(`Error: ${JSON.stringify(error)}`)
            }
        })
    }

    public static getRemotePublicKey(host = 'localhost', port = '54345') {
        return new Promise<Buffer>((resolve, reject) => {
            // This is an independant websocket because 'getRemotePublicKey' is a static method
            const socket = new WebSocket(`ws:${host}:${port}`)
            
            socket.onopen = () => {
                socket.send(JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'get_public_key',
                    params: [],
                    id: 0,
                }))
                socket.onmessage = (evt) => resolve(JSON.parse(evt.data).result.data)
                socket.onerror = (error) => reject(`Error: ${JSON.stringify(error)}`)
            }
        })
    }
}
