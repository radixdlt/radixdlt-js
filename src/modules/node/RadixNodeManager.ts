import axios from 'axios'
import RadixNodeConnection from './RadixNodeConnection'
import RadixNode from './RadixNode'
import * as promiseRetry from 'promise-retry'
import * as Long from 'long'
import RadixSerilaizer from '../serializer/RadixSerializer'
import RadixUtil from '../common/RadixUtil'

//Singleton
export class RadixNodeManager {
  private bootstrapNodes: Array<string> = [
    // 'http://localhost:8080/rpc',
    // 'http://52.190.0.18:8080/rpc',
    'https://137.117.139.116:8443/rpc'
  ]
  private activeBootstrapNode = 0

  private liveNodes: Array<RadixNode> = []
  private connectedNodes: Array<RadixNodeConnection> = []

  private bootstrapService = 'https://alphanet.radixdlt.com/node-finder'
  // private bootstrapService = 'https://highgarden.radixdlt.com/node-finder'
  // private bootstrapService = 'https://sunstone.radixdlt.com/node-finder'

  private lastNetworkUpdate = 0
  private networkUpdateInterval = 1000 * 60 * 10

  constructor() {
    //Get network from bootstrap nodes
    //this.loadPeersFromBootstrap()
  }

  private loadPeersFromBootstrap() {
    let getPeersRequestData = {
      id: 0,
      method: 'Network.getLivePeers',
      params: []
    }

    return promiseRetry(
      async (retry, number) => {
        try {
          //Load new bootstrap node
          let bootstrapNodeIP = (await axios.get(this.bootstrapService)).data
          if (bootstrapNodeIP.length < 2) {
            throw new Error('Invalid bootstrap node')
          }
          let bootstrapNode = 'https://' + bootstrapNodeIP + '/rpc'

          console.log(
            'Loading peers from bootstrap node ' +
              bootstrapNode +
              ', try #' +
              number
          )

          let response = await axios.post(bootstrapNode, getPeersRequestData)

          this.liveNodes = RadixSerilaizer.fromJson(response.data.result)
          console.log(this.liveNodes)
          this.lastNetworkUpdate = Date.now()
          return this.liveNodes
        } catch (error) {
          console.error(error)
          retry()
        }
      },
      {
        retries: 1000,
        maxtimeout: 60000
      }
    )
  }

  async getNodeConnection(shard: Long): Promise<RadixNodeConnection> {
    //TODO: for now just give each node new connection
    //Foreach connected node
    //Check if shard matches
    // for (let i = 0; i < this.connectedNodes.length; i++) {
    //     if (this.canNodeServiceShard(this.connectedNodes[i].node, shard)) {
    //         resolve(this.connectedNodes[i])
    //     }
    // }

    //Otherwise open new connection
    let connection = await this.openNodeConnection(shard)
    if (connection) {
      return connection
    } else {
      throw new Error('Could not find a node to connect to')
    }
  }

  async openNodeConnection(shard: Long): Promise<RadixNodeConnection | null> {
    if (Date.now() - this.lastNetworkUpdate > this.networkUpdateInterval) {
      await this.loadPeersFromBootstrap()
    }

    //Randomize node order every time
    this.liveNodes = RadixUtil.shuffleArray(this.liveNodes)

    for (let node of this.liveNodes) {
      if (this.canNodeServiceShard(node, shard)) {
        let connection = new RadixNodeConnection(node)
        this.connectedNodes.push(connection)

        try {
          await connection.openConnection()
        } catch (error) {
          console.log(error)
          return null
        }

        return connection
      }
    }

    return null
  }

  public closeAllConnections = () => {
    for (let connection of this.connectedNodes) {
      connection.close()
    }
  }

  private canNodeServiceShard(node: RadixNode, shard: Long): boolean {
    if (node.system) {
      const low = Long.fromValue(node.system.shards.low)
      const high = Long.fromValue(node.system.shards.high)

      if (high.lessThan(low)) {
        //Wrap around
        return shard.greaterThanOrEqual(low) || shard.lessThanOrEqual(high)
      } else {
        return shard.greaterThanOrEqual(low) && shard.lessThanOrEqual(high)
      }
    }

    return false
  }
}

export let radixNodeManager = new RadixNodeManager()
