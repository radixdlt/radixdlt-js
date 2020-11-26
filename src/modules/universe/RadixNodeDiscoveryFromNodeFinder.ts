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
import { RadixNode, RadixPeer } from '../..'

/**
 * Node discovery from the Radix bootstrap service
 */
export default class RadixNodeDiscoveryFromNodeFinder implements RadixNodeDiscovery {
    
    /**
     * Creates an instance of radix node discovery from node finder.
     * @param bootstrapService The full address to the node finder service for the universe
     */
    constructor(
        readonly bootstrapService: string, 
        readonly wsAddress: (host: string, port: number) => string,
        readonly httpAddress: (host: string, port: number) => string) {}

    public async loadNodes() {
        const bootstrapNodeIP = (await axios.get(this.bootstrapService)).data
        if (bootstrapNodeIP.length < 2) {
            throw new Error('Failed to get node list from bootstrap service')
        }
        const bootstrapNode = this.httpAddress(bootstrapNodeIP, 0)

        const getPeersRequestData = {
            id: 0,
            method: 'Network.getLivePeers',
            params: [],
        }
        const nodeListResponse = await axios.post(
            bootstrapNode,
            getPeersRequestData,
        )

        const nodeList: RadixPeer[] = RadixSerializer.fromJSON(nodeListResponse.data.result)

        if (nodeList.length === 0) {
            throw new Error('Bootstrap node has no connections')
        }

        return nodeList.map((peerInfo) => {
            return new RadixNode(peerInfo.system, 
                this.wsAddress(peerInfo.host.ip, peerInfo.host.port),
                this.httpAddress(peerInfo.host.ip, peerInfo.host.port))
        })
    }
}
