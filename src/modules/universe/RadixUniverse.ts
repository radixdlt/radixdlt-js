/*
 * (C) Copyright 2020 Radix DLT Ltd
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the “Software”),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

import { logger } from '../common/RadixLogger'

import promiseRetry from 'promise-retry'
import {
    radixTokenManager,
    shuffleArray,
    RadixNode,
    RadixNodeDiscoveryHardcoded,
    RadixNodeDiscovery,
    RadixNodeConnection,
    RadixLedger,
    RadixAtomStore,
    RadixAtomNodeStatus,
    RadixUniverseConfig,
    RadixBootstrapConfig,
} from '../..'

import { RRI, RadixFixedSupplyTokenDefinitionParticle, RadixMutableSupplyTokenDefinitionParticle } from '../atommodel'
import ipaddr from 'ipaddr.js'
import { RadixNEDBAtomStore } from '../ledger/RadixNEDBAtomStore'
import { RadixPartialBootstrapConfig } from './RadixBootstrapConfig'
import axios from 'axios'
import { LOCALHOST } from '../atommodel/universe/RadixUniverseConfig'

export default class RadixUniverse {

    public static LOCAL_SINGLE_NODE: RadixBootstrapConfig = {
        universeConfig: LOCALHOST,
        nodeDiscovery: new RadixNodeDiscoveryHardcoded(['localhost:8080'], false),
        finalityTime: 0,
    }

    public initialized = false
    public universeConfig: RadixUniverseConfig
    public nodeDiscovery: RadixNodeDiscovery
    public ledger: RadixLedger

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
    public async bootstrap(config: RadixBootstrapConfig, atomStore?: RadixAtomStore) {
        await this.closeAllConnections()
        this.connectedNodes = []
        this.liveNodes = []
        this.lastNetworkUpdate = 0

        this.universeConfig = config.universeConfig
        this.nodeDiscovery = config.nodeDiscovery

        // Deserialize config
        this.universeConfig.initialize()

        // Find native token
        for (const atom of this.universeConfig.genesis) {
            const tokenClasses = []
                .concat(atom.getParticlesOfType(RadixFixedSupplyTokenDefinitionParticle))
                .concat(atom.getParticlesOfType(RadixMutableSupplyTokenDefinitionParticle))

            if (tokenClasses.length === 0) {
                throw new Error(`Couldn't find native token in genesis`)
            } else {
                if (tokenClasses.length > 1) {
                    logger.warn('More than 1 tokens defined in genesis, using the first')
                }

                this.nativeToken = tokenClasses[0].getRRI()
            }
        }

        // Ledger
        if (!atomStore) {
            atomStore = RadixNEDBAtomStore.createInMemoryStore()
        }

        // Push genesis atoms into the atomstore
        for (const atom of this.universeConfig.genesis) {
            atomStore.insert(atom, { status: RadixAtomNodeStatus.STORED_FINAL })
        }

        this.ledger = new RadixLedger(this, atomStore, config.finalityTime)

        this.initialized = true

        // Token manager
        radixTokenManager.initialize(this.nativeToken)
    }

    /**
     * Bootstraps the universe using the universe config of connected nodes.
     */
    public async bootstrapTrustedNode(config: RadixPartialBootstrapConfig, atomStore?: RadixAtomStore): Promise<void> {
        const nodes = await config.nodeDiscovery.loadNodes()

        if (!nodes[0]) {
            throw new Error('ERROR: No nodes found.')
        }

        const nodeUrl = new URL(nodes[0].httpAddress)
        const universeConfigData = (await axios.get(`http://${nodeUrl.host}/api/universe`)).data
        const nodeUniverseConfig = new RadixUniverseConfig(universeConfigData)
        nodeUniverseConfig.initialize()

        await this.bootstrap({
            ...config,
            universeConfig: nodeUniverseConfig,
        }, atomStore)
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
        // const bootstrapNodesLenght = (this.nodeDiscovery as RadixNodeDiscoveryHardcoded).bootstrapNodes.length;
        // if(bootstrapNodesLenght > 1)
        //     throw new Error('not cool ' + bootstrapNodesLenght)
        return promiseRetry(
            async (retry, attempt) => {
                try {
                    this.liveNodes = await this.nodeDiscovery.loadNodes()
                    this.lastNetworkUpdate = Date.now()
                    return this.liveNodes
                } catch (error) {
                    logger.error(error)
                    retry(error)
                }
            },
            {
                retries: 5,
                maxtimeout: 10000,
            },
        )
    }

    /**
     * Gets a RadixNodeConnection
     * Updates the node list if neccessary
     * @returns node connection
     */
    public getNodeConnection(): Promise<RadixNodeConnection> {
        this.isInitialized()

        return new Promise<RadixNodeConnection>((resolve, reject) => {
            // Find active connection, return
            for (const node of this.connectedNodes) {
                if (node.isReady()) {
                    logger.info('Got an active connection')
                    return resolve(node)
                }
            }

            // Failing that, find a pending node connection
            for (const nodeConnection of this.connectedNodes) {
                logger.info('Got a pending connection')
                // Wait for ready or error
                nodeConnection.on('open', () => {
                    resolve(nodeConnection)
                })

                nodeConnection.on('closed', () => {
                    resolve(this.getNodeConnection())
                })

                return
            }

            // Open a new connection, return when ready
            logger.info('Opening a new connection')
            this.openNodeConnection().then((connection) => {
                if (connection) {
                    resolve(connection)
                } else {
                    reject(new Error(`Couldn't find a node to connect to`))
                }
            }).catch(e => {
                reject(e)
            })
        })
    }

    private async openNodeConnection(): Promise<RadixNodeConnection | null> {
        if (Date.now() - this.lastNetworkUpdate > this.networkUpdateInterval) {
            await this.loadPeersFromBootstrap()
        }

        // Randomize node order every time
        this.liveNodes = shuffleArray(this.liveNodes)

        for (const node of this.liveNodes) {
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

        return null
    }

    /**
     * Close all open connections
     * Recommended to call this before quitting the application, so that nodes can close the corresponding open connections as well
     */
    public closeAllConnections = async () => {
        const tasks = []
        for (const connection of this.connectedNodes) {
            tasks.push(connection.close())
        }
        await Promise.all(tasks)
    }

    /**
     * Get the latest known list of the live nodes in the network
     * Updated 60 seconds after the previous update whenever a new connection is requested
     */
    public getLiveNodes(): RadixNode[] {
        return this.liveNodes
    }

    private isInitialized() {
        if (!this.initialized) {
            throw new Error(
                'Universe needs to be initialized before using the library, please call "radixUniverse.bootstrap" with a universe configuration')
        }
    }

    /**
     * Given an IP address this function resolves a deterministic
     * DNS record in the radixnode.net domain.
     *
     * @param address IP address or hostname
     */
    public static resolveNodeName(address) {
        try {
            const ipbytes = ipaddr.parse(address).toByteArray();
            if (ipbytes.length == 4) { // IPv4
                // trivial but safe left-shift function that does not overflow
                const shl = (base, exp) => base * Math.pow(2, exp)
                // use + instead of | (bitwise or) because it overflows
                let ip = ipbytes[3] + shl(ipbytes[2], 8) + shl(ipbytes[1], 16) + shl(ipbytes[0], 24)
                return `a${ip.toString(36)}.radixnode.net`
            }
            logger.warn('No base36 encoder for IPv6 yet')
            return `[${address}]`
        } catch (err) {
            // the address has neither IPv6 nor IPv4 format => hostname
        }
        return address
    }

}

export const radixUniverse = new RadixUniverse()
