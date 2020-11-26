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

import axios from 'axios'

import RadixNodeDiscovery from './RadixNodeDiscovery'

import { RadixSerializer } from '../atommodel'
import { RadixNode, RadixNodeSystem } from '../..'

/**
 * Radix node discovery from a fixed list
 */
export default class RadixNodeDiscoveryHardcoded implements RadixNodeDiscovery {
    private readonly httpProtocol: string
    private readonly wsProtocol: string
    
    /**
     * Creates an instance of radix node discovery from seed.
     * @param bootstrapNodes List of full addresses to the rpc endpoints of Radix nodes in the universe
     * @param ssl Whether to use SSL encryption for communication wiht the nodes
     */
    constructor(
        readonly bootstrapNodes: string[],
        readonly ssl = false,
    ) {
        if (bootstrapNodes.length < 1) {
            throw new Error('ERROR: List of bootstrap nodes cannot be empty.')
        }
        
        this.httpProtocol = ssl ? 'https' : 'http'
        this.wsProtocol = ssl ? 'wss' : 'ws'
    }

    public async loadNodes() {
        return Promise.all(this.bootstrapNodes.map(async (address) => {
            const response = await axios.get(`${this.httpProtocol}://${address}/api/system`)
            const nodeInfo: RadixNodeSystem = RadixSerializer.fromJSON(response.data)
            const node = new RadixNode(nodeInfo, `${this.wsProtocol}://${address}/rpc`, `${this.httpProtocol}://${address}/rpc`)
            return node
        }))
    }
}
