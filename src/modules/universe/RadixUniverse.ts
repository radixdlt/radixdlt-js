import RadixUniverseConfig from './RadixUniverseConfig'
import RadixNodeDiscovery from './RadixNodeDiscovery'
import RadixNodeDiscoveryFromNodeFinder from './RadixNodeDiscoveryFromNodeFinder'
import RadixNodeDiscoveryFromSeed from './RadixNodeDiscoveryFromSeed'
import RadixNode from './RadixNode'
import RadixNodeConnection from './RadixNodeConnection'
import RadixUtil from '../common/RadixUtil'

import * as promiseRetry from 'promise-retry'
import * as Long from 'long'

export default class RadixUniverse {
    public static ALPHANET = {
        universeConfig: RadixUniverseConfig.ALPHANET,
        nodeDiscovery: new RadixNodeDiscoveryFromNodeFinder(
            'https://alphanet.radixdlt.com/node-finder'
        ),
        nodePort: 443
    }

    public static HIGHGARDEN = {
        universeConfig: RadixUniverseConfig.HIGHGARDEN,
        nodeDiscovery: new RadixNodeDiscoveryFromNodeFinder(
            'https://highgarden.radixdlt.com/node-finder'
        ),
        nodePort: 443
    }

    // public static SUNSTONE = {
    //   universeConfig: RadixUniverseConfig.SUNSTONE,
    //   nodeDiscovery: new RadixNodeDiscoveryFromNodeFinder('https://sunstone.radixdlt.com/node-finder'),
    //   nodePort: 443,
    // }

    public static WINTERFELL = {
        universeConfig: RadixUniverseConfig.WINTERFELL,
        nodeDiscovery: new RadixNodeDiscoveryFromSeed(
            'http://52.190.0.18:8080/rpc'
        ),
        nodePort: 8080
    }

    public static WINTERFELL_LOCAL = {
        universeConfig: RadixUniverseConfig.WINTERFELL_LOCAL,
        nodeDiscovery: new RadixNodeDiscoveryFromSeed(
            'http://localhost:8080/rpc'
        ),
        nodePort: 8080
    }

    public initialized = false
    public universeConfig: RadixUniverseConfig
    public nodeDiscovery: RadixNodeDiscovery
    public nodePort: number

    private liveNodes: RadixNode[] = []
    private connectedNodes: RadixNodeConnection[] = []
    private lastNetworkUpdate = 0
    private networkUpdateInterval = 1000 * 60 * 10

    /**
     * Bootstraps the universe with a specific configuration
     * Must be called before performing any operations
     * Use one of the predefined static configurations in this class
     * @param config
     */
    public bootstrap(config: {
        universeConfig: RadixUniverseConfig
        nodeDiscovery: RadixNodeDiscovery
        nodePort: number
    }) {
        this.universeConfig = config.universeConfig
        this.nodeDiscovery = config.nodeDiscovery
        this.nodePort = config.nodePort
        this.initialized = true
    }

    /**
     * Gets the universe magic byte, used mainly for generating an address from a public key
     * @returns
     */
    public getMagicByte() {
        return this.universeConfig.getMagicByte()
    }

    private loadPeersFromBootstrap() {
        return promiseRetry(
            async (retry, attempt) => {
                try {
                    this.liveNodes = await this.nodeDiscovery.loadNodes()
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

    /**
     * Gets a RadixNodeConnection for a specified shard
     * Updates the node list if neccessary
     * @param shard
     * @returns node connection
     */
    public async getNodeConnection(shard: Long): Promise<RadixNodeConnection> {
        // TODO: reuse connections, for now just give each node new connection
        const connection = await this.openNodeConnection(shard)
        if (connection) {
            return connection
        } else {
            throw new Error('Could not find a node to connect to')
        }
    }

    private async openNodeConnection(
        shard: Long
    ): Promise<RadixNodeConnection | null> {
        if (Date.now() - this.lastNetworkUpdate > this.networkUpdateInterval) {
            await this.loadPeersFromBootstrap()
        }

        // Randomize node order every time
        this.liveNodes = RadixUtil.shuffleArray(this.liveNodes)

        for (const node of this.liveNodes) {
            if (this.canNodeServiceShard(node, shard)) {
                const connection = new RadixNodeConnection(node, this.nodePort)
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

    /**
     * Close all open connections
     * Recommended to call this before quitting the application, so that nodes can close the corresponding open connections as well
     */
    public closeAllConnections = () => {
        for (const connection of this.connectedNodes) {
            connection.close()
        }
    }

    private canNodeServiceShard(node: RadixNode, shard: Long): boolean {
        if (node.system) {
            const low = Long.fromValue(node.system.shards.low)
            const high = Long.fromValue(node.system.shards.high)

            if (high.lessThan(low)) {
                // Wrap around
                return (
                    shard.greaterThanOrEqual(low) || shard.lessThanOrEqual(high)
                )
            } else {
                return (
                    shard.greaterThanOrEqual(low) && shard.lessThanOrEqual(high)
                )
            }
        }

        return false
    }
}

export const radixUniverse = new RadixUniverse()
