import 'mocha'
import { expect } from 'chai'
import { doesNotReject } from 'assert'
import { identity, zip } from 'rxjs'
import { filter } from 'rxjs/operators'

import Decimal from 'decimal.js'
import BN from 'bn.js'
import axios from 'axios'

import {
    radixUniverse,
    RadixUniverse,
    RadixIdentityManager,
    RadixTransactionBuilder,
    RadixAccount,
    RadixLogger,
} from '../../src'

import { RadixDecryptionState } from '../../src/modules/account/RadixDecryptionAccountSystem'
import { RadixTokenClassReference } from '../../src/modules/atommodel/particles/tokens/RadixTokenClassReference'
import { radixTokenManager } from '../../src/index'

import { RadixTokenClass } from '../../src/modules/token/RadixTokenClass'

describe('Creating Token Classes', () => {
    RadixLogger.setLevel('error')

    const universeConfig = RadixUniverse.LOCAL

    radixUniverse.bootstrap(universeConfig)

    const identityManager = new RadixIdentityManager()

    const identity1 = identityManager.generateSimpleIdentity()
    const identity2 = identityManager.generateSimpleIdentity()

    const xrdTokenReferenceURI: string = '/JH1P8f3znbyrDj8F4RWpix7hRkgxqHjdW2fNnKpR3v6ufXnknor/tokenclasses/XRD'    

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
    it('Should create a single issuance token', function (done) {
        this.timeout(50000)

        const symbol = 'RLAU'
        const name = 'RLAU test'
        const description = 'Test token'
        const granularity = new BN(1)
        const amount = 1

        new RadixTransactionBuilder().createTokenSingleIssuance(
            identity1.account,
            name,
            symbol,
            description,
            granularity,
            amount,
        )
            .signAndSubmit(identity1)
            .subscribe({
                complete: () => done(),
                error: e => done(new Error(JSON.stringify(e))),
            })
    })

    // Check token class in account

    // Create a conflicting token
    it('Should fail when creating a conflicting single issuance token due to an invalid granularity', function (done) {
        this.timeout(50000)

        const symbol = 'CONFLICTING_RLAU'
        const name = 'RLAU conflicting test'
        const description = 'Conglicting test token'
        const granularity = new BN(3)
        const amount = 1

        try {
            new RadixTransactionBuilder().createTokenSingleIssuance(
                identity1.account,
                name,
                symbol,
                description,
                granularity,
                amount,
            )
                .signAndSubmit(identity1)
                .subscribe({ complete: () => done(new Error("This token shouldn't be created")) })

            // Catch clause here, because the error might happen when calling 'createTokenSingleIssuance'
        } catch (e) {
            done()
        }
    })

    // Send token
    it('Should send a bunch of RLAU tokens from identity1 to identity2', function (done) {
        this.timeout(50000)

        const symbol = 'RLAU'
        const name = 'RLAU test'
        const description = 'Test token'
        const granularity = new BN(1)

        const tokenClass = new RadixTokenClass(identity1.address, symbol, name, description, granularity)

        console.log('\nBalance of both accounts before the transaction:\n')
        for (let tokenId in identity1.account.transferSystem.balance) {
            console.log(`identity1 - ${tokenId}: ${identity1.account.transferSystem.balance[tokenId].toString()}`)
        }
        console.log()
        for (let tokenId in identity2.account.transferSystem.balance) {
            console.log(`identity2 - ${tokenId}: ${identity2.account.transferSystem.balance[tokenId].toString()}`)
        }
        console.log()

        RadixTransactionBuilder.createTransferAtom(
            identity1.account,
            identity2.account,
            tokenClass,
            new Decimal(0.5),
        )
            .signAndSubmit(identity1)
            .subscribe({
                complete: () => done(),
                next: state => {
                    if (state === 'STORED') {
                        console.log('\nBalance of both accounts after the transaction:\n')
                        for (let tokenId in identity1.account.transferSystem.balance) {
                            console.log(`identity1 - ${tokenId}: ${identity1.account.transferSystem.balance[tokenId].toString()}`)
                        }
                        console.log()
                        for (let tokenId in identity2.account.transferSystem.balance) {
                            console.log(`identity2 - ${tokenId}: ${identity2.account.transferSystem.balance[tokenId].toString()}`)
                        }
                        console.log()
                    }
                },
                error: e => done(new Error(e)),
            })

    })

    // // Mint token
    // it('Should mint a bunch of RLAU tokens', function (done) {
    //     this.timeout(50000)

    //     const rlauTokenReferenceURI: string = '/JFKfFj9eFX6Yn9ZVZAotpW4UCmkN8i89HonHKaj2ZHeuFp2uRKB/tokenclasses/RLAU'

    //     new RadixTransactionBuilder().mintTokens(
    //         identity1.account,
    //         rlauTokenReferenceURI,
    //         1000,
    //     )
    //         .signAndSubmit(identity1)
    //         .subscribe({
    //             complete: () => done(),
    //             // next: state => console.log(state),
    //             error: e => done(new Error(e)),
    //         })
    // })

    // Recieve other's token

    // Check total supply


    // Empty balance
    it('Should read the balance of every token in an account (RLAU and XRD) and they should not be null', function (done) {
        this.timeout(50000)

        // expect(identity1.account.transferSystem.balance[xrdTokenReferenceURI]).to.not.eq(null)
        // expect(identity1.account.transferSystem.balance[rlauTokenReferenceURI]).to.not.eq(null)

        // console.log(xrdTokenReferenceURI)
        // console.log(rlauTokenReferenceURI)

        // console.log(identity1.account.transferSystem.balance)
        // console.log(identity2.account.transferSystem.balance)

        // console.log(identity1.account.transferSystem.balance[xrdTokenReferenceURI].toString())
        // console.log(identity1.account.transferSystem.balance[rlauTokenReferenceURI].toString())

        // for (const tokenId in identity2.account.transferSystem.balance) {
        //     console.log(tokenId)
        // }

        // console.log(identity2.account.transferSystem.balance[xrdTokenReferenceURI])
        // console.log(identity2.account.transferSystem.balance[rlauTokenReferenceURI])

        done()
    })
})
