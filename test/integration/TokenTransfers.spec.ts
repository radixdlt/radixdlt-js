import 'mocha'
import { expect } from 'chai'

import {
  radixUniverse,
  RadixUniverse,
  RadixIdentityManager,
  RadixTransactionBuilder,
  RadixAccount,
  RadixLogger,
  logger,
  RadixIdentity,
} from '../../src'

const ERROR_MESSAGE = 'Local node needs to be running to run these tests'

describe('Token transfers', () => {
    const identityManager = new RadixIdentityManager()

    let identity1: RadixIdentity
    let account2: RadixAccount
    let TBD_URI: string

    before(async () => {
        RadixLogger.setLevel('error')

        const universeConfig = RadixUniverse.LOCALHOST
        await radixUniverse.bootstrapTrustedNode(universeConfig)

        // Check node is available
        try {
            await universeConfig.nodeDiscovery.loadNodes()
        } catch {
            logger.error(ERROR_MESSAGE)
            throw new Error(ERROR_MESSAGE)
        }

        identity1 = identityManager.generateSimpleIdentity()
        account2 = RadixAccount.fromAddress('JHnGqXsMZpTuGwt1kU92mSpKasscJzfkkZJHe2vaEvBM3jJiVBq')
        TBD_URI = `/${identity1.account.getAddress()}/TBD`
    })

    it('should create a single issuance TBD token with account1', function(done) {
        this.timeout(50000)

        const symbol = 'TBD'
        const name = 'my token name'
        const description = 'my token description'
        const granularity = 0.01
        const amount = 500
        const iconUrl = 'http://a.b.com'

        new RadixTransactionBuilder().createTokenSingleIssuance(
            identity1.account,
            name,
            symbol,
            description,
            granularity,
            amount,
            iconUrl,
        )
        .signAndSubmit(identity1)
        .subscribe({
            complete: () => done(),
            error: e => done(new Error(JSON.stringify(e))),
        })
    })

    it('should throw an error when trying to send to self', function() {
        expect(() => {
            RadixTransactionBuilder.createTransferAtom(
                identity1.account,
                identity1.account,
                TBD_URI,
                5,
                )
        }).to.throw()   
    })

    it('should throw an error when trying to send negative amount', function() {
        expect(() => {
            RadixTransactionBuilder.createTransferAtom(
                identity1.account,
                account2,
                TBD_URI,
                -1,
                )
        }).to.throw()   
    })

    it('should throw an error when trying to send zero', function() {
        expect(() => {
            RadixTransactionBuilder.createTransferAtom(
                identity1.account,
                account2,
                TBD_URI,
                0,
                )
        }).to.throw()   
    })

    it('should throw an error when trying to send too many tokens', function() {
        expect(() => {
            RadixTransactionBuilder.createTransferAtom(
                identity1.account,
                account2,
                TBD_URI,
                5000000,
                )
        }).to.throw()   
    })

})
