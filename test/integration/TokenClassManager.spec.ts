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
  logger,
  RadixTokenClassReference,
  radixTokenManager,
} from '../../src'

import { RadixDecryptionState } from '../../src/modules/account/RadixDecryptionAccountSystem'
import { RadixTokenClass } from '../../src/modules/token/RadixTokenClass'

const ERROR_MESSAGE = 'Local node needs to be running to run these tests'

describe('RLAU-96: Querying token class state', () => {
    const universeConfig = RadixUniverse.LOCAL

    radixUniverse.bootstrap(universeConfig)

    const identityManager = new RadixIdentityManager()

    const identity1 = identityManager.generateSimpleIdentity()

    const TCD1_URI = `/${identity1.account.getAddress()}/tokenclasses/TCD1`

    const tcd1_symbol = 'TCD1'
    const tcd1_name = 'TCD1 name'
    const tcd1_description = 'TCD1 description'
    const tcd1_granularity = new BN(1)
    const tcd1_amount = 10000
    const tcd1_extra_amount = 2000
    const tcd1_burn_amount = 3000

    before(async () => {
        logger.setLevel('error')
        // Check node is available
        try {
            await universeConfig.nodeDiscovery.loadNodes()
        } catch {
        logger.error(ERROR_MESSAGE)
            throw new Error(ERROR_MESSAGE)
        }

        await identity1.account.openNodeConnection()
    })

    after(async () => {
        await identity1.account.closeNodeConnection()
    })

    it('should create a single issuance TCD1 token with account1', function (done) {
        this.timeout(50000)

        new RadixTransactionBuilder().createTokenMultiIssuance(
            identity1.account,
            tcd1_name,
            tcd1_symbol,
            tcd1_description,
            tcd1_granularity,
            tcd1_amount,
        )
            .signAndSubmit(identity1)
            .subscribe({
                complete: () => done(),
                error: e => done(new Error(JSON.stringify(e))),
        })
    })

    it('(1) query for valid token', function(done) {
        this.timeout(50000)

        radixTokenManager.getTokenClass(TCD1_URI).then(tokenClass => {
            expect(tokenClass.symbol).to.eq(tcd1_symbol)
            expect(tokenClass.name).to.eq(tcd1_name)
            expect(tokenClass.description).to.eq(tcd1_description)
            expect(tokenClass.getGranularity().toString()).to.eq(tcd1_granularity.toString())
            expect(tokenClass.totalSupply.toString()).to.eq(RadixTokenClass.fromDecimalToSubunits(tcd1_amount).toString())
            
            done()
        }).catch(done)
    })

    it('(2) query invalid token', function(done) {
        radixTokenManager.getTokenClass('what even is this').then(tokenClass => {
            done(new Error('Shoudld not have found a token class'))
        }).catch(error => {
            expect(error.message).to.include('RRI must be of the format')
            done()
        })
    })

    it('(3) observing a token mint', function(done) {
        this.timeout(50000)

        
        radixTokenManager.getTokenClassObservable(TCD1_URI).then(tokenClassObservable => {
            const expectedAmount = tcd1_amount + tcd1_extra_amount
            
            const subscription = tokenClassObservable.subscribe(
                tokenClass => {
                    logger.debug('mint detected: ' + RadixTokenClass.fromSubunitsToDecimal(tokenClass.totalSupply))
                    if (RadixTokenClass.fromSubunitsToDecimal(tokenClass.totalSupply).eq(expectedAmount)) {
                        subscription.unsubscribe()
                        done()
                    }
                }
            )

            new RadixTransactionBuilder().mintTokens(
                identity1.account,
                TCD1_URI,
                tcd1_extra_amount,
            ).signAndSubmit(identity1)
            .subscribe({
                error: e => done(new Error(JSON.stringify(e))),
            })
        }).catch(done)
    })


    it('(4) observing a token burn', function(done) {
        this.timeout(50000)

        
        radixTokenManager.getTokenClassObservable(TCD1_URI).then(tokenClassObservable => {
            const expectedAmount = tcd1_amount + tcd1_extra_amount - tcd1_burn_amount
            
            const subscription = tokenClassObservable.subscribe(
                tokenClass => {
                    if (RadixTokenClass.fromSubunitsToDecimal(tokenClass.totalSupply).eq(expectedAmount)) {
                        subscription.unsubscribe()
                        done()
                    }
                }
            )

            new RadixTransactionBuilder().burnTokens(
                identity1.account,
                TCD1_URI,
                tcd1_burn_amount,
            ).signAndSubmit(identity1)
            .subscribe({
                error: e => done(new Error(JSON.stringify(e))),
            })
        }).catch(done)
    })


    it('(5) query invalid token', function(done) {
        radixTokenManager.getTokenClass(TCD1_URI + 's').then(tokenClass => {
            done(new Error('Shoudld not have found a token class'))
        }).catch(error => {
            expect(error.message).to.include('Token class does not exist in the accoun')
            done()
        })
    })

})
