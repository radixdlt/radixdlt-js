import 'mocha'
import BN from 'bn.js'
import {expect} from 'chai'


import {
    radixUniverse,
    RadixUniverse,
    RadixIdentityManager,
    RadixTransactionBuilder,
    RadixLogger,
    RadixAccount,
    RadixNodeConnection,
    logger,
} from '../../src'

import { RadixDecryptionState } from '../../src/modules/account/RadixDecryptionAccountSystem'
import { RadixTokenDefinition } from '../../src/modules/token/RadixTokenDefinition';

describe('RLAU-1005: Handle atom DELETE events', () => {
    RadixLogger.setLevel('error')

    const universeConfig = RadixUniverse.LOCAL

    radixUniverse.bootstrap(universeConfig)

    const identityManager = new RadixIdentityManager()

    const identity1 = identityManager.generateSimpleIdentity()
    const identity2 = identityManager.generateSimpleIdentity()

    const TEST_TOKEN_SYMBOL = 'CONF'
    const TEST_TOKEN_REF = `/${identity1.account.getAddress()}/tokens/${TEST_TOKEN_SYMBOL}`

    before(async () => {
        logger.setLevel('error')
        // Check node is available
        try {
            await universeConfig.nodeDiscovery.loadNodes()
        } catch {
            const message = 'Local node needs to be running to run these tests'
            console.error(message)
            throw new Error(message)
        }

        await identity1.account.openNodeConnection()
        await identity2.account.openNodeConnection()
    })

    after(async () => {
        await identity1.account.closeNodeConnection()
        await identity2.account.closeNodeConnection()

        // This take a long time
        // radixUniverse.closeAllConnections()
        // Soo just kill it 
        // process.exit(0)
    })

    it('should create a new token', (done) => {
        new RadixTransactionBuilder().createTokenMultiIssuance(
            identity1.account,
            'Test Tokens',
            TEST_TOKEN_SYMBOL,
            'description',
            new BN(1),
            2000,
        )
        .signAndSubmit(identity1)
        .subscribe({
            complete: () => done(),
            error: e => done(new Error(JSON.stringify(e))),
        })
    })

    it('should submit two conflicting transfers and expect one of them to fail', function(done) {
        this.timeout(15000)

        // Find 2 nodes
        const nodes = radixUniverse.getLiveNodes().filter(node => {
            return node.canServiceShard(identity1.account.address.getShard())
        })

        let node1: RadixNodeConnection
        let node2: RadixNodeConnection

        let openConnectionPromise

        if (nodes.length >= 2) {
            console.log('Using two nodes')
            node1 = new RadixNodeConnection(nodes[0])
            node2 = new RadixNodeConnection(nodes[1])
            openConnectionPromise = Promise.all([node1.openConnection(), node2.openConnection()])
        } else if (nodes.length === 1) {
            console.warn('Using a single node')
            node1 = new RadixNodeConnection(nodes[0])
            node2 = node1
            openConnectionPromise = node1.openConnection()
        } else {
            throw new Error('Couldn\'t find a node to test against')
        }



        openConnectionPromise.then(() => {
            // Construct 2 conflicting atoms
            const atom1 = RadixTransactionBuilder.createTransferAtom(
                identity1.account, 
                identity2.account, 
                TEST_TOKEN_REF,
                1000,
            ).buildAtom()

            const atom2 = RadixTransactionBuilder.createTransferAtom(
                identity1.account, 
                identity2.account, 
                TEST_TOKEN_REF,
                1000,
            ).buildAtom()
            

            const expectedValues = ['2000', '1000', '0', '1000']
            let i = 0
            const subscription = identity1.account.transferSystem.getTokenUnitsBalanceUpdates().map(balance => {
                return balance[TEST_TOKEN_REF].toString()
            })
            .subscribe(balance => {
                if (balance !== expectedValues[i]) {
                    done(`Expected value #${i} to be '${expectedValues[i]}', actual '${balance}'`)
                }
                i++

                if (i === expectedValues.length) {
                    subscription.unsubscribe()
                    expect(identity1.account.transferSystem.transactions.length === 2)
                    done()
                }
            })

            // Submit both
            RadixTransactionBuilder.signAndSubmitAtom(atom1, node1, identity1, [identity1.account, identity2.account])
            RadixTransactionBuilder.signAndSubmitAtom(atom2, node2, identity1, [identity1.account, identity2.account])

        })
    })
    
    
    it('should submit two conflicting burns and expect one of them to fail', function(done) {
        this.timeout(15000)

        // Find 2 nodes
        const nodes = radixUniverse.getLiveNodes().filter(node => {
            return node.canServiceShard(identity1.account.address.getShard())
        })

        let node1: RadixNodeConnection
        let node2: RadixNodeConnection

        let openConnectionPromise

        if (nodes.length >= 2) {
            node1 = new RadixNodeConnection(nodes[0])
            node2 = new RadixNodeConnection(nodes[1])
            openConnectionPromise = Promise.all([node1.openConnection(), node2.openConnection()])
        } else if (nodes.length === 1) {
            console.warn('Using a single node')
            node1 = new RadixNodeConnection(nodes[0])
            node2 = node1
            openConnectionPromise = node1.openConnection()
        } else {
            throw new Error('Couldn\'t find a node to test against')
        }



        openConnectionPromise.then(() => {
            // Construct 2 conflicting atoms
            const atom1 = RadixTransactionBuilder.createBurnAtom(
                identity1.account,
                TEST_TOKEN_REF,
                1000)
            .buildAtom()

            const atom2 = RadixTransactionBuilder.createBurnAtom(
                identity1.account,
                TEST_TOKEN_REF,
                1000)
            .buildAtom()
            

            const expectedValues = ['2000', '1000', '0', '1000']
            let i = 0
            const subscription = identity1.account.tokenDefinitionSystem.getTokenDefinitionObservable(TEST_TOKEN_SYMBOL).map(token => {
                return RadixTokenDefinition.fromSubunitsToDecimal(token.totalSupply).toString()
            })
            .subscribe(totalSupply => {
                if (totalSupply !== expectedValues[i]) {
                    done(`Expected value #${i} to be '${expectedValues[i]}', actual '${totalSupply}'`)
                }
                i++

                if (i === expectedValues.length) {
                    subscription.unsubscribe()
                    done()
                }
            })

            // Submit both
            RadixTransactionBuilder.signAndSubmitAtom(atom1, node1, identity1, [identity1.account, identity2.account])
            RadixTransactionBuilder.signAndSubmitAtom(atom2, node2, identity1, [identity1.account, identity2.account])

        })
    })


    
})
