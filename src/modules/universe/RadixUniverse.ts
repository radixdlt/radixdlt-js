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
    shuffleArray,
    RadixNode,
    RadixNodeDiscoveryHardcoded,
    RadixNodeDiscovery,
    RadixNodeConnection,
    RadixLedger,
    RadixAtomStore,
    RadixAtomNodeStatus,
    RadixUniverseConfig,
    RadixBootstrapConfig, RadixTokenManager, RadixAddress, RadixAccount
} from '../..'

import { RRI, RadixFixedSupplyTokenDefinitionParticle, RadixMutableSupplyTokenDefinitionParticle } from '../atommodel'
import ipaddr from 'ipaddr.js'
import { RadixNEDBAtomStore } from '../ledger/RadixNEDBAtomStore'
import { RadixPartialBootstrapConfig } from './RadixBootstrapConfig'
import axios from 'axios'
import { LOCALHOST } from '../atommodel/universe/RadixUniverseConfig'
import { assertCorrectUniverseHID } from './RadixNodeConnection'
import { makeAccountFromUniverseAndAddress } from '../radix-application-client/RadixApplicationClient'

export const makeMakeAccountFromUniverseAndAddress = (universe: RadixUniverse): ((address: RadixAddress) => RadixAccount) => {
    const accountFromUniverseAndAddress = (address: RadixAddress): RadixAccount => {
        return makeAccountFromUniverseAndAddress(universe, address)
    }
    return accountFromUniverseAndAddress
}


export default class RadixUniverse {

    public static LOCAL_SINGLE_NODE: RadixBootstrapConfig = {
        universeConfig: LOCALHOST,
        nodeDiscovery: new RadixNodeDiscoveryHardcoded(['localhost:8080'], false),
        finalityTime: 0,
    }

    public universeConfig: RadixUniverseConfig
    public nodeDiscovery: RadixNodeDiscovery
    public ledger: RadixLedger

    public nativeToken: RRI

    private liveNodes: RadixNode[] = []
    private connectedNodes: RadixNodeConnection[] = []
    private lastNetworkUpdate = 0
    private networkUpdateInterval = 1000 * 60 * 10
    private radixTokenManager: RadixTokenManager

    constructor() {
        logger.error(`\n\n\n⭐️ Creating universe...\n\n\n\n`)
    }

    private async bootstrap(bootstrapConfig: RadixBootstrapConfig, awaitNodeConnection: boolean): Promise<void> {
        this.connectedNodes = []
        this.liveNodes = []
        this.lastNetworkUpdate = 0

        this.universeConfig = bootstrapConfig.universeConfig
        this.nodeDiscovery = bootstrapConfig.nodeDiscovery

        // Deserialize config
        this.universeConfig.initialize()

        // Find native token
        let nativeToken: RRI
        const genesisAtoms = this.universeConfig.genesis
        for (const atom of genesisAtoms) {
            const tokenClasses = []
                .concat(atom.getParticlesOfType(RadixFixedSupplyTokenDefinitionParticle))
                .concat(atom.getParticlesOfType(RadixMutableSupplyTokenDefinitionParticle))

            if (tokenClasses.length === 0) {
                throw new Error(`Couldn't find native token in genesis`)
            } else {
                if (tokenClasses.length > 1) {
                    logger.warn('More than 1 tokens defined in genesis, using the first')
                }

                nativeToken = tokenClasses[0].getRRI()
            }
        }
        this.nativeToken = nativeToken

        // Ledger
        const atomStore = RadixNEDBAtomStore.createInMemoryStore()

        // Push genesis atoms into the atomstore

        logger.error(`⭐️ found #${genesisAtoms.length} genesis atoms, inserting them in the atom store now`)
        for (const atom of genesisAtoms) {
            logger.error(`⭐️🐋 inserting genesis atom with AID=${atom.getAidString()} into atom store.`)
            atomStore.insert(atom, { status: RadixAtomNodeStatus.STORED_FINAL })
        }

        this.ledger = new RadixLedger(this, atomStore, bootstrapConfig.finalityTime)

        // Token manager
        this.radixTokenManager = undefined

        const radixTokenManager = new RadixTokenManager(
            this.nativeToken,
            makeMakeAccountFromUniverseAndAddress(this),
        )

        this.radixTokenManager = radixTokenManager

        if (awaitNodeConnection) {
            await this.openNodeConnection()
        }
    }

    public static async createByBootstrapingTrustedNode(
        bootstrapConfig: RadixPartialBootstrapConfig = RadixUniverse.LOCAL_SINGLE_NODE,
        awaitNodeConnection: boolean = true,
    ): Promise<RadixUniverse> {
        const newUniverse = new RadixUniverse()
        await newUniverse.bootstrapTrustedNode(bootstrapConfig, awaitNodeConnection)
        return newUniverse
    }

    /**
     * Bootstraps the universe using the universe config of connected nodes.
     */
    private async bootstrapTrustedNode(
        partialBootstrapConfig: RadixPartialBootstrapConfig,
        awaitNodeConnection: boolean,
    ): Promise<void> {
        const nodes = await partialBootstrapConfig.nodeDiscovery.loadNodes()

        if (!nodes[0]) {
            throw new Error('ERROR: No nodes found.')
        }

        const nodeUrl = new URL(nodes[0].httpAddress)
        const universeConfigData = (await axios.get(`http://${nodeUrl.host}/api/universe`)).data
        const nodeUniverseConfig = new RadixUniverseConfig(universeConfigData)
        nodeUniverseConfig.initialize()

        const bootstrapConfig: RadixBootstrapConfig = {
            ...partialBootstrapConfig,
            universeConfig: nodeUniverseConfig,
        }

        await this.bootstrap(bootstrapConfig, awaitNodeConnection)
    }

    /**
     * Gets the universe magic byte, used mainly for generating an address from a public key
     * @returns
     */
    public getMagicByte() {
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

        return new Promise<RadixNodeConnection>((resolve, reject) => {
            // Find active connection, return

            // logger.error(`🔮 RadixUniverse:getNodeConnection - connectedNodes: ${this.connectedNodes}`)
            logger.error(`🔮 RadixUniverse:getNodeConnection - #connectedNodes: ${this.connectedNodes.length}`)

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
                    logger.error(`🔮 NodeConnection closed => 🚨 calling 'getNodeConnection()' now`)
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
                    logger.error(`🔮  NodeConnection reject`)
                    reject(new Error(`Couldn't find a node to connect to`))
                }
            }).catch(e => {
                logger.error(`🔮  NodeConnection reject`)
                reject(e)
            })
        })
    }

    private async openNodeConnection(): Promise<RadixNodeConnection | null> {
        if (Date.now() - this.lastNetworkUpdate > this.networkUpdateInterval) {
            logger.error(`🔮 calling 'this.loadPeersFromBootstrap()'`)
            await this.loadPeersFromBootstrap()
        } else {
            logger.error(`🔮 skipping call to 'this.loadPeersFromBootstrap()'`)

        }

        logger.error(`🔮 liveNodes: #${this.liveNodes.length}`)

        // Randomize node order every time
        this.liveNodes = shuffleArray(this.liveNodes)

        for (const node of this.liveNodes) {

            const connection = new RadixNodeConnection(
                node,
                assertCorrectUniverseHID(this.universeConfig),
            )

            this.connectedNodes.push(connection)
            logger.error(`🔮 connectedNodes: #${this.connectedNodes.length}`)

            connection.on('closed', () => {
                // Remove connection from connected nodes

                logger.error(`🔮  NodeConnection closed`)
                const nodeIndex = this.connectedNodes.indexOf(connection)
                if (nodeIndex > -1) {
                    this.connectedNodes.splice(nodeIndex, 1)
                }
            })

            try {
                await connection.openConnection()
            } catch (error) {
                logger.error(`🔮 Node connection error: ${error}`)
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

    /**
     * Given an IP address this function resolves a deterministic
     * DNS record in the radixnode.net domain.
     *
     * @param address IP address or hostname
     */
    public static resolveNodeName(address) {
        try {
            const ipbytes = ipaddr.parse(address).toByteArray();
            if (ipbytes.length === 4) { // IPv4
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
