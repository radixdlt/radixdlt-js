import 'mocha'
import {
    RadixIdentityManager,
    RadixIdentity,
    RadixNodeConnection,
    RadixLogger,
    radixUniverse,
    RadixUniverseConfig,
    RadixNodeDiscoveryHardcoded,
    RadixUniverse,
    RadixBootstrapConfig,
} from '../../src'
import { expect } from 'chai'
import local from '../../src/modules/universe/configs/local.json'

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

const timeout = 10000
let universe: RadixUniverse

describe('BS-306: Check hid on connection', function () {
    this.timeout(timeout)
    let nodeConnection: RadixNodeConnection

    before(() => {
        RadixLogger.setLevel('error')
    })

    after(() => {
        nodeConnection.unsubscribeAll()
    })

    describe('incompatible universe', () => {
        let identities: RadixIdentity[]

        before(async () => {
            const invalidRawConfig = {
                ...local,
                name: ':str:Fake',
            }

            const invalidUniverse = new RadixUniverseConfig(invalidRawConfig)

            const INVALID_CONFIG = {
                universeConfig: invalidUniverse,
                nodeDiscovery: new RadixNodeDiscoveryHardcoded(['localhost:8080', 'localhost:8081'], false),
                finalityTime: 2000,
            }

            identities = await connect(INVALID_CONFIG)
        })

        it('should close the connection', async () => {
            nodeConnection = await universe.getNodeConnection(identities[0].address.getShard())

            const promise = new Promise(async (resolve, reject) => {
                nodeConnection.on('closed', () => {
                    resolve()
                })
                await sleep(timeout - 1000)
                reject('Connection was not closed.')
            })

            return promise
        })
    })

    describe('compatible universe', () => {
        let identities: RadixIdentity[]

        before(async () => {
            const CONFIG = RadixUniverse.LOCALHOST
            identities = await connect(CONFIG)
        })

        it('should open the connection and sync the account', async () => {
            nodeConnection = await universe.getNodeConnection(identities[1].address.getShard())

            const promise = new Promise(async (resolve, reject) => {
                await sleep(3000)
                const observable = identities[1].account.isSynced()
                observable.subscribe(isSynced => {
                    if (isSynced) {
                        resolve()
                    }
                })
                await sleep(1000)
                reject('Account was not synced.')
            })

            return promise
        })
    })
})

async function connect(config: RadixBootstrapConfig): Promise<RadixIdentity[]> {
    const identityManager = new RadixIdentityManager()
    universe = new RadixUniverse()
    universe.bootstrap(config)

    // Required to overwrite config used in the global universe singleton.
    radixUniverse.bootstrap(config)

    try {
        await config.nodeDiscovery.loadNodes()
    } catch {
        const message = 'Local node needs to be running to run these tests'
        console.error(message)
        throw new Error(message)
    }

    const identity1 = identityManager.generateSimpleIdentity()
    const identity2 = identityManager.generateSimpleIdentity()

    return [
        identity1,
        identity2,
    ]
}
