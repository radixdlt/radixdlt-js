import { expect } from 'chai'
import axios from 'axios'
import 'mocha'
import { radixUniverse, RadixUniverse, RadixIdentityManager, RadixTransactionBuilder, RadixLogger, RadixAccount } from '../../src';
import { identity, zip } from 'rxjs';
import { filter } from 'rxjs/operators';
import { RadixDecryptionState } from '../../src/modules/account/RadixDecryptionAccountSystem';
import { doesNotReject } from 'assert';
import Decimal from 'decimal.js';

describe('Creating Token Classes', () => {
    RadixLogger.setLevel('info')
    const universeConfig = RadixUniverse.LOCAL
    radixUniverse.bootstrap(universeConfig)

    const identityManager = new RadixIdentityManager()

    const identity1 = identityManager.generateSimpleIdentity()
    const identity2 = identityManager.generateSimpleIdentity()


    before(async () => {
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

        // // This take a long time
        // radixUniverse.closeAllConnections()
        // Soo just kill it 
        // process.exit(0)
    })




    // Create a token
    // Check token class in account
    it('Should create a single issuance token', (done) => {
        const symbol = 'RLAU'
        const name = 'RLAU test'
        const description = 'Test token'
        const icon = Buffer.from('')
        const amount = new Decimal('100000000')

        new RadixTransactionBuilder().createTokenSignleIssuance(
            identity1.account,
            name,
            symbol,
            description,
            icon,
            amount,
        )
        .signAndSubmit(identity1)
        .subscribe({
            complete: () => {
                done()
            },
            next: state =>  console.log(state),
            error: e =>   {
                console.error(e)
                done(new Error(e))
            },
        })
    })



    // Create a conflicting token

    // Mint token

    // Recieve other's token


    // Check total supply
})

