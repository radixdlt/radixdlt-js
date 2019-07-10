import axios from 'axios'

import RadixNodeDiscovery from './RadixNodeDiscovery'

import { RadixSerializer } from '../atommodel'
import { RadixNode, RadixNodeSystem } from '../..'

/**
 * Radix node discovery from a fixed list
 */
export default class RadixNodeDiscoveryHardcoded implements RadixNodeDiscovery {
    
    /**
     * Creates an instance of radix node discovery from seed.
     * @param bootstrapNode Full address to the rpc endpoint of a Radix node in the universe
     */
    constructor(
        readonly bootstrapNodes: string[],
        ) {}

    public async loadNodes() {
        return Promise.all(this.bootstrapNodes.map(async (address) => {
            try {
                const response = await axios.get(`http://${address}/api/system`)
                const nodeInfo: RadixNodeSystem = RadixSerializer.fromJSON(response.data)
                const node = new RadixNode(nodeInfo, `ws://${address}/rpc`, `http://${address}/rpc`)
                return node
            } catch (error) {
                throw error
            }
        }))
    }
}
