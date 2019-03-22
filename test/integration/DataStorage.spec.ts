import 'mocha'
import { expect } from 'chai'
import { doesNotReject } from 'assert'
import { identity, zip } from 'rxjs'
import { filter } from 'rxjs/operators'

import axios from 'axios'

import {
    radixUniverse,
    RadixUniverse,
    RadixIdentityManager,
    RadixTransactionBuilder,
    RadixLogger,
    RadixAccount,
} from '../../src'

import { RadixDecryptionState } from '../../src/modules/account/RadixDecryptionAccountSystem'

describe('Storing and retrieving data', () => {
    RadixLogger.setLevel('error')

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
        await identity2.account.closeNodeConnection()

        // This take a long time
        // radixUniverse.closeAllConnections()
        // Soo just kill it 
        // process.exit(0)
    })

    it('should submit data to a node', (done) => {
        const appId = 'test'
        const payload = Math.random().toString(36)

        RadixTransactionBuilder.createPayloadAtom(
            identity1.account,
            [identity2.account],
            appId,
            payload,
            true,
        )
            .signAndSubmit(identity1)
            .subscribe({
                complete: () => {
                    done()
                },
                // next: state => console.log(state),
                error: e => console.error(e),
            })
    })

    it('should send data to self', (done) => {
        const appId = 'test'
        const payload = Math.random().toString(36)

        RadixTransactionBuilder.createPayloadAtom(
            identity1.account,
            [identity1.account],
            appId,
            payload,
            true,
        )
            .signAndSubmit(identity1)
            .subscribe({
                complete: () => {
                    identity1.account.dataSystem.getApplicationData(appId).subscribe(update => {
                        if (update.data.payload.data === payload) {
                            done()
                        }
                    })
                },
                // next: state => console.log(state),
                error: e => console.error(e),
            })
    })

    it('should send data to another account', (done) => {
        const appId = 'test'
        const payload = Math.random().toString(36)

        RadixTransactionBuilder.createPayloadAtom(
            identity1.account,
            [identity1.account, identity2.account],
            appId,
            payload,
            true,
        )
            .signAndSubmit(identity1)
            .subscribe({
                complete: () => {
                    // Look for the data in both accounts
                    const acc1stream = identity1.account.dataSystem.getApplicationData(appId).pipe(filter(update => update.data.payload.data === payload))
                    const acc2stream = identity2.account.dataSystem.getApplicationData(appId).pipe(filter(update => update.data.payload.data === payload))

                    // Finish only when data has been found in both accounts
                    zip(acc1stream, acc2stream).subscribe(val => {
                        done()
                    })
                },
                // next: state => console.log(state),
                error: e => console.error(e),
            })
    })

    it('should deal with undecryptable data', (done) => {
        const appId = 'test'
        const payload = Math.random().toString(36)

        // Create a broken encrypted message
        new RadixTransactionBuilder()
            .addMessageParticle(
            identity1.account,
            payload,
            {
                application: appId,
            },
            [identity1.account, identity2.account],
        )
            .addMessageParticle(identity1.account,
            JSON.stringify([]),
            {
                application: 'encryptor',
                contentType: 'application/json',
            },
            [identity1.account, identity2.account])
            .signAndSubmit(identity1)
            .subscribe({
                complete: () => {
                    identity2.account.dataSystem.getApplicationData(appId).subscribe(update => {
                        if (update.data.payload.data === payload) {
                            if (update.data.payload.decryptionState === RadixDecryptionState.CANNOT_DECRYPT) {
                                done()
                            }
                        }
                    })
                },
                // next: state => console.log(state),
                error: e => console.error(e),
            })
    })
})
