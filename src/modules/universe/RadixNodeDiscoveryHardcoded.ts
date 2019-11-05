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
    private readonly bootstrapNodes: string[]
    
    /**
     * Creates an instance of radix node discovery from seed.
     * @param bootstrapNodes List of full addresses to the rpc endpoints of Radix nodes in the universe
     * @param ssl Whether to use SSL encryption for communication wiht the nodes
     */
    constructor(
        bootstrapNodes: string[],
        readonly ssl = false,
    ) {
        if(bootstrapNodes.length < 1) {
            throw new Error('ERROR: List of bootstrap nodes cannot be empty.')
        }

        this.bootstrapNodes = bootstrapNodes
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
