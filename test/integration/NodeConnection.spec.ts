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

import 'mocha'
import {
    RadixIdentityManager,
    RadixIdentity,
    RadixNodeConnection,
    logger,
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

    before(async () => {
        logger.setLevel('error')
        const universeConfig = RadixUniverse.LOCALHOST
        radixUniverse.bootstrap(universeConfig)
        // Check node is available
        try {
            await universeConfig.nodeDiscovery.loadNodes()
        } catch {
            const message = 'Local node needs to be running to run these tests'
            logger.error(message)
            throw new Error(message)
        }
    })

    after(() => {
        nodeConnection.unsubscribeAll()
    })

    // describe('incompatible universe', () => {
    //     let identities: RadixIdentity[]
    //
    //     before(async () => {
    //         const invalidRawConfig = {
    //             ...local,
    //             name: ':str:Fake',
    //         }
    //
    //         const invalidUniverse = new RadixUniverseConfig(invalidRawConfig)
    //
    //         const INVALID_CONFIG = {
    //             universeConfig: invalidUniverse,
    //             // FIXME: Second host disabled for now
    //             nodeDiscovery: new RadixNodeDiscoveryHardcoded(['localhost:8080' /*, 'localhost:8081'*/], false),
    //             finalityTime: 2000,
    //         }
    //
    //         identities = await connect(INVALID_CONFIG)
    //     })
    //
    //     it('should close the connection', async () => {
    //         nodeConnection = await universe.getNodeConnection()
    //
    //         const promise = new Promise(async (resolve, reject) => {
    //             nodeConnection.on('closed', () => {
    //                 resolve()
    //             })
    //             await sleep(timeout - 1000)
    //             reject('Connection was not closed.')
    //         })
    //
    //         return promise
    //     })
    // })

    describe('compatible universe', () => {
        let identities: RadixIdentity[]

        before(async () => {
            const CONFIG = RadixUniverse.LOCALHOST
            identities = await connect(CONFIG)
        })

        it('should open the connection and sync the account', async () => {
            nodeConnection = await universe.getNodeConnection()

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
