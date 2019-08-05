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
     * @param bootstrapNode Full address to the rpc endpoint of a Radix node in the universe
     * @param ssl Whether to use SSL encryption for communication wiht the nodes
     */
    constructor(
        readonly bootstrapNodes: string[],
        readonly ssl = false,
    ) {
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
