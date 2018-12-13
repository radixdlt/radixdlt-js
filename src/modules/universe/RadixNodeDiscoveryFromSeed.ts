import axios from 'axios'

import RadixNodeDiscovery from './RadixNodeDiscovery'

import { RadixSerializer } from '../atommodel'

/**
 * Radix node discovery from a seed node
 */
export default class RadixNodeDiscoveryFromSeed implements RadixNodeDiscovery {
    
    /**
     * Creates an instance of radix node discovery from seed.
     * @param bootstrapNode Full address to the rpc endpoint of a Radix node in the universe
     */
    constructor(readonly bootstrapNode: string) {}

    public async loadNodes() {
        // const getPeersRequestData = {
        //     id: 0,
        //     method: 'Network.getLivePeers',
        //     params: []
        // }
        // const nodeListResponse = await axios.post(
        //     this.bootstrapNode,
        //     getPeersRequestData,
        // )

        // return RadixSerializer.fromJSON(nodeListResponse.data.result)

        return RadixSerializer.fromJSON([{
            'hid': ':uid:15f3efa043a95a46bee55155ceed0d5d',
            'system': {
                'ledger': {
                    'processed': 0,
                    'latency': {
                        'path': 0,
                        'persist': 0
                    },
                    'checksum': -6731487211990683800,
                    'processing': 0,
                    'particles': {
                        'stored': 7,
                        'storing': 0
                    },
                    'faults': {
                        'tears': 0,
                        'stitched': 0
                    },
                    'atoms': {
                        'stored': 3,
                        'storing': 0
                    }
                },
                'period': 0,
                'agent': {
                    'protocol': 100,
                    'name': ':str:/Radix:/3000000',
                    'version': 3000000
                },
                'hid': ':uid:7592a652da756b17224f944df0c55891',
                'memory': {
                    'total': 2058354688,
                    'max': 2058354688,
                    'free': 1458012824
                },
                'serializer': -1833998801,
                'commitment': ':hsh:0000000000000000000000000000000000000000000000000000000000000000',
                'clock': 0,
                'processors': 4,
                'version': 100,
                'shards': {
                    'high': 9223372036854775807,
                    'low': -9223372036854775808
                },
                'witness': {
                    'stored': 0,
                    'processing': 0
                },
                'port': 30000,
                'messages': {
                    'inbound': {
                        'processed': 105,
                        'discarded': 0,
                        'pending': 0,
                        'received': 106
                    },
                    'outbound': {
                        'processed': 105,
                        'aborted': 0,
                        'pending': 0,
                        'sent': 105
                    }
                },
                'key': ':byt:A5wBR8ZDu4zq6SeZsmUebMlakzOSJw/hfVKbXlft6XmO',
                'events': {
                    'processed': 245,
                    'processing': 1
                }
            },
            'host': {
                'port': 30000,
                'ip': ':str:172.18.0.3'
            },
            'serializer': 151517315,
            'version': 100
        }])
    }
}
