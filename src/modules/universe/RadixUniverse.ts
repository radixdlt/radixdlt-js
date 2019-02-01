import RadixUniverseConfig from './RadixUniverseConfig'
import RadixNodeDiscovery from './RadixNodeDiscovery'
import RadixNodeDiscoveryFromNodeFinder from './RadixNodeDiscoveryFromNodeFinder'
import RadixNodeDiscoveryFromSeed from './RadixNodeDiscoveryFromSeed'
import RadixNode from './RadixNode'
import RadixNodeConnection from './RadixNodeConnection'
import { logger } from '../common/RadixLogger'

import Long from 'long'
import promiseRetry from 'promise-retry'
import { RadixTokenClassParticle, RadixTokenClassReference } from '../atommodel'
import { radixTokenManager, shuffleArray } from '../..'

export default class RadixUniverse {

    public static ALPHANET = {
        universeConfig: RadixUniverseConfig.ALPHANET,
        nodeDiscovery: new RadixNodeDiscoveryFromNodeFinder(
            'https://alphanet.radixdlt.com/node-finder',
            nodeIp => `https://alphanet.radixdlt.com/node/${nodeIp}/rpc`),
        nodeRPCAddress: nodeIp => `wss://alphanet.radixdlt.com/node/${nodeIp}/rpc`,
    }

    public static HIGHGARDEN = {
        universeConfig: RadixUniverseConfig.HIGHGARDEN,
        nodeDiscovery: new RadixNodeDiscoveryFromNodeFinder(
            'https://highgarden.radixdlt.com/node-finder',
            nodeIp => `https://highgarden.radixdlt.com/node/${nodeIp}/rpc`),
        nodeRPCAddress: nodeIp => `wss://highgarden.radixdlt.com/node/${nodeIp}/rpc`,
    }

    public static SUNSTONE = {
        universeConfig: RadixUniverseConfig.BETANET,
        nodeDiscovery: new RadixNodeDiscoveryFromNodeFinder(
            'https://sunstone.radixdlt.com/node-finder',
            nodeIp => `https://${nodeIp}/rpc`),
        nodeRPCAddress: nodeIp => `wss://${nodeIp}:443/rpc`,
    }

    public static LOCAL = {
        universeConfig: RadixUniverseConfig.BETANET,
        nodeDiscovery: new RadixNodeDiscoveryFromSeed('http://localhost:8080/rpc'),
        nodeRPCAddress: nodeIp => `ws://127.0.0.1:8080/rpc`,
    }

    // public static WINTERFELL = {
    //     universeConfig: RadixUniverseConfig.WINTERFELL,
    //     nodeDiscovery: new RadixNodeDiscoveryFromSeed('http://52.190.0.18:8080/rpc'),
    //     nodeRPCAddress: nodeIp => `ws://${nodeIp}:8080/rpc`,
    // }

    // public static WINTERFELL_LOCAL = {
    //     universeConfig: RadixUniverseConfig.WINTERFELL_LOCAL,
    //     nodeDiscovery: new RadixNodeDiscoveryFromSeed('http://localhost:8080/rpc'),
    //     nodeRPCAddress: nodeIp => `ws://127.0.0.1:8080/rpc`,
    // }

    public initialized = false
    public universeConfig: RadixUniverseConfig
    public nodeDiscovery: RadixNodeDiscovery
    public nodeRPCAddress: (nodeIp: string) => string

    public powToken: RadixTokenClassReference
    public nativeToken: RadixTokenClassReference

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
        nodeRPCAddress: (nodeIp: string) => string,
    }) {
        this.universeConfig = config.universeConfig
        this.nodeDiscovery = config.nodeDiscovery
        this.nodeRPCAddress = config.nodeRPCAddress

        // Deserialize config
        this.universeConfig.initialize()

        // Find POW token
        for (const atom of this.universeConfig.genesis) {
            const tokenClasses = atom.getParticlesOfType(RadixTokenClassParticle)

            for (const tokenClass of tokenClasses) {
                if (tokenClass.getTokenClassReference().symbol === 'POW') {
                    this.powToken = tokenClass.getTokenClassReference()
                    break
                }
            }
        }

        if (!this.powToken) {
            throw new Error('No POW token defined in the universe config')
        }

        // Find POW token
        for (const atom of this.universeConfig.genesis) {
            const tokenClasses = atom.getParticlesOfType(RadixTokenClassParticle)

            for (const tokenClass of tokenClasses) {
                if (tokenClass.getTokenClassReference().symbol !== 'POW') {
                    this.nativeToken = tokenClass.getTokenClassReference()
                    break
                }
            }
        }

        if (!this.nativeToken) {
            throw new Error('No native token defined in the universe config')
        }


        radixTokenManager.initialize(this.universeConfig.genesis, this.powToken, this.nativeToken)

        this.initialized = true
    }

    /**
     * Gets the universe magic byte, used mainly for generating an address from a public key
     * @returns
     */
    public getMagicByte() {
        this.isInitialized()

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
                    logger.error(error)
                    retry()
                }
            },
            {
                retries: 1000,
                maxtimeout: 60000,
            },
        )
    }

    /**
     * Gets a RadixNodeConnection for a specified shard
     * Updates the node list if neccessary
     * @param shard
     * @returns node connection
     */
    public getNodeConnection(shard: Long): Promise<RadixNodeConnection> {
        this.isInitialized()

        return new Promise<RadixNodeConnection>((resolve, reject) => {
            // Find active connection, return
            for (const node of this.connectedNodes) {
                if (node.isReady() && this.canNodeServiceShard(node.node, shard)) {
                    logger.info('Got an active connection')
                    return resolve(node)
                }
            }

            // Failing that, find a pending node connection
            for (const node of this.connectedNodes) {
                if (this.canNodeServiceShard(node.node, shard)) {
                    logger.info('Got a pending connection')
                    // Wait for ready or error
                    node.on('open', () => {
                        resolve(node)
                    })

                    node.on('closed', () => {
                        resolve(this.getNodeConnection(shard))
                    })

                    return
                }
            }

            // Open a new connection, return when ready
            logger.info('Opening a new connection')
            this.openNodeConnection(shard).then((connection) => {
                if (connection) {
                    resolve(connection)
                } else {
                    reject(`Coudln't find a node to connect to`)
                }
            })
        })
    }

    private async openNodeConnection(
        shard: Long,
    ): Promise<RadixNodeConnection | null> {
        if (Date.now() - this.lastNetworkUpdate > this.networkUpdateInterval) {
            await this.loadPeersFromBootstrap()
        }

        // Randomize node order every time
        this.liveNodes = shuffleArray(this.liveNodes)

        for (const node of this.liveNodes) {
            if (this.canNodeServiceShard(node, shard)) {
                const connection = new RadixNodeConnection(node, this.nodeRPCAddress)
                this.connectedNodes.push(connection)

                connection.on('closed', () => {
                    // Remove connection from connected nodes 
                    const nodeIndex = this.connectedNodes.indexOf(connection)
                    if (nodeIndex > -1) {
                        this.connectedNodes.splice(nodeIndex, 1)
                    }
                })

                try {
                    await connection.openConnection()
                } catch (error) {
                    logger.error(error)
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

    private isInitialized() {
        if (!this.initialized) {
            throw new Error(
                'Universe needs to be initialized before using the library, please call "radixUniverse.bootstrap" with a universe configuration')
        }
    }
}

export const radixUniverse = new RadixUniverse()
