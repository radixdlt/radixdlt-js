import RadixNodeDiscovery from './RadixNodeDiscovery'
import axios from 'axios'
import RadixSerilaizer from '../serializer/RadixSerializer'


/**
 * Node discovery from the Radix bootstrap service
 */
export default class RadixNodeDiscoveryFromNodeFinder implements RadixNodeDiscovery {
    

    
    /**
     * Creates an instance of radix node discovery from node finder.
     * @param bootstrapService The full address to the node finder service for the universe
     */
    constructor(readonly bootstrapService: string) {

    }


    public async loadNodes() {
        const bootstrapNodeIP = (await axios.get(this.bootstrapService)).data
        if (bootstrapNodeIP.length < 2) {
            throw new Error('Failed to get node list from bootstrap service')
        }
        const bootstrapNode = 'https://' + bootstrapNodeIP + '/rpc'

        const getPeersRequestData = {
            id: 0,
            method: 'Network.getLivePeers',
            params: [],
        }
        const nodeListResponse = await axios.post(bootstrapNode, getPeersRequestData)

        return RadixSerilaizer.fromJson(nodeListResponse.data.result)
    }
}
