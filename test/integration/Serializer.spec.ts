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
        radixUniverse.bootstrap(universeConfig)

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

    it('should successfully sign and submit an atom with a payload of 65kb', done => {
        const appId = 'test'
        let payload = ''
        for (let i = 0; i < 65000; i++) {
            payload += 'X'
        }

        RadixTransactionBuilder.createPayloadAtom(
            identity1.account,
            [identity1.account],
            appId,
            payload,
            false,
        )
        .signAndSubmit(identity1)
        .subscribe({
            complete: () => done(),
            error: e => done(new Error(JSON.stringify(e))),
        })
    })

})
