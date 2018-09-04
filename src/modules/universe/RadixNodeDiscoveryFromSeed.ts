import RadixNodeDiscovery from './RadixNodeDiscovery'
import axios from 'axios'
import RadixSerilaizer from '../serializer/RadixSerializer'


/**
 * Radix node discovery from a seed node
 */
export default class RadixNodeDiscoveryFromSeed implements RadixNodeDiscovery {
    

    
    /**
     * Creates an instance of radix node discovery from seed.
     * @param bootstrapNode Full address to the rpc endpoint of a Radix node in the universe
     */
    constructor(readonly bootstrapNode: string) {

    }


    public async loadNodes() {      
        const getPeersRequestData = {
            id: 0,
            method: 'Network.getLivePeers',
            params: [],
        }
        const nodeListResponse = await axios.post(this.bootstrapNode, getPeersRequestData)

        return RadixSerilaizer.fromJson(nodeListResponse.data.result)
    }
}
