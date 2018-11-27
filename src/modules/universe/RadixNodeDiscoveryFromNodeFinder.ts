import axios from 'axios'

import RadixNodeDiscovery from './RadixNodeDiscovery'

import { RadixSerializer } from '../atommodel'

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
        readonly nodeRPCAddress: (nodeIp: string) => string) {}

    public async loadNodes() {
        const bootstrapNodeIP = (await axios.get(this.bootstrapService)).data
        if (bootstrapNodeIP.length < 2) {
            throw new Error('Failed to get node list from bootstrap service')
        }
        const bootstrapNode = this.nodeRPCAddress(bootstrapNodeIP)

        const getPeersRequestData = {
            id: 0,
            method: 'Network.getLivePeers',
            params: []
        }
        const nodeListResponse = await axios.post(
            bootstrapNode,
            getPeersRequestData
        )

        const nodeList = RadixSerializer.fromJSON(nodeListResponse.data.result)

        if (nodeList.length === 0) {
            throw new Error('Bootstrap node has no connections')
        }

        return nodeList
    }
}
