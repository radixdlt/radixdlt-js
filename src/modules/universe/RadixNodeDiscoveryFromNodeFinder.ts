import axios from 'axios'

import RadixNodeDiscovery from './RadixNodeDiscovery'

import { RadixSerializer } from '../atommodel'
import { RadixNodeInfo, RadixNode } from '../..';

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

        const nodeList: RadixNodeInfo[] = RadixSerializer.fromJSON(nodeListResponse.data.result)

        if (nodeList.length === 0) {
            throw new Error('Bootstrap node has no connections')
        }

        return nodeList.map((nodeInfo) => {
            return new RadixNode(nodeInfo, 
                this.wsAddress(nodeInfo.host.ip, nodeInfo.host.port),
                this.httpAddress(nodeInfo.host.ip, nodeInfo.host.port))
        })
    }
}
