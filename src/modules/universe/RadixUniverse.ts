import { logger } from '../common/RadixLogger'

import Long from 'long'
import promiseRetry from 'promise-retry'
import { 
    radixTokenManager, 
    shuffleArray, 
    RadixNode, 
    RadixUniverseConfig, 
    RadixNodeDiscoveryFromNodeFinder, 
    RadixNodeDiscoveryHardcoded, 
    RadixNodeDiscovery, 
    RadixNodeConnection } from '../..'
import { RadixTokenDefinitionParticle, RRI } from '../atommodel';

export default class RadixUniverse {
    public static BETANET = {
        universeConfig: RadixUniverseConfig.BETANET,
        nodeDiscovery: new RadixNodeDiscoveryFromNodeFinder(
            'https://betanet.radixdlt.com/node-finder',
            (ip, port) => `wss://${ip}:443/rpc`,
            (ip, post) => `https://${ip}/rpc`,
        ),
    }

    public static SUNSTONE = {
        universeConfig: RadixUniverseConfig.SUNSTONE,
        nodeDiscovery: new RadixNodeDiscoveryFromNodeFinder(
            'https://sunstone.radixdlt.com/node-finder',
            (ip, port) => `wss://sunstone.radixdlt.com/node/${ip}/rpc`,
            (ip, post) => `https://sunstone.radixdlt.com/node/${ip}/rpc`,
        ),
    }

    public static LOCAL = {
        universeConfig: RadixUniverseConfig.LOCAL,
        nodeDiscovery: new RadixNodeDiscoveryHardcoded(['localhost:8080', 'localhost:8081']),
    }

    public initialized = false
    public universeConfig: RadixUniverseConfig
    public nodeDiscovery: RadixNodeDiscovery

    public nativeToken: RRI

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
        universeConfig: RadixUniverseConfig,
        nodeDiscovery: RadixNodeDiscovery,
    }) {
        this.universeConfig = config.universeConfig
        this.nodeDiscovery = config.nodeDiscovery

        // Deserialize config
        this.universeConfig.initialize()

        // Find native token
        for (const atom of this.universeConfig.genesis) {
            const tokenClasses = atom.getParticlesOfType(RadixTokenDefinitionParticle)

            if (tokenClasses.length === 0) {
                throw new Error(`Couldn't find native token in genesis`)
            } else {
                if (tokenClasses.length > 1) {
                    logger.warn('More than 1 tokens defined in genesis, using the first')
                }

                this.nativeToken = tokenClasses[0].getRRI()
            }
        }

        radixTokenManager.initialize(this.universeConfig.genesis, this.nativeToken)

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
                if (node.isReady() && node.node.canServiceShard(shard)) {
                    logger.info('Got an active connection')
                    return resolve(node)
                }
            }

            // Failing that, find a pending node connection
            for (const nodeConnection of this.connectedNodes) {
                if (nodeConnection.node.canServiceShard(shard)) {
                    logger.info('Got a pending connection')
                    // Wait for ready or error
                    nodeConnection.on('open', () => {
                        resolve(nodeConnection)
                    })

                    nodeConnection.on('closed', () => {
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
            if (node.canServiceShard(shard)) {
                const connection = new RadixNodeConnection(node)
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

    public getLiveNodes(): RadixNode[] {
        return this.liveNodes
    }

    private isInitialized() {
        if (!this.initialized) {
            throw new Error(
                'Universe needs to be initialized before using the library, please call "radixUniverse.bootstrap" with a universe configuration')
        }
    }
}

export const radixUniverse = new RadixUniverse()
