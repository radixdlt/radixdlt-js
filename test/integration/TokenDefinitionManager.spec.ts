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
  logger,
  radixTokenManager,
  RadixTokenDefinition,
  RadixIdentity,
} from '../../src'

const ERROR_MESSAGE = 'Local node needs to be running to run these tests'

describe('RLAU-96: Querying token definition state', () => {

    const identityManager = new RadixIdentityManager()
    let identity1: RadixIdentity
    let TCD1_URI: string

    const tcd1Symbol = 'TCD1'
    const tcd1Name = 'TCD1 name'
    const tcd1Description = 'TCD1 description'
    const tcd1Granularity = new BN(1)
    const tcd1Amount = 10000
    const tcd1ExtraAmount = 2000
    const tcd1BurnAmount = 3000
    const tcd1IconUrl = 'http://a.b.com'

    before(async () => {
        logger.setLevel('error')

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
        TCD1_URI = `/${identity1.account.getAddress()}/TCD1`

        await identity1.account.openNodeConnection()
    })

    after(async () => {
        await identity1.account.closeNodeConnection()
    })

    it('should create a single issuance TCD1 token with account1', function (done) {
        this.timeout(15000)

        new RadixTransactionBuilder().createTokenMultiIssuance(
            identity1.account,
            tcd1Name,
            tcd1Symbol,
            tcd1Description,
            tcd1Granularity,
            tcd1Amount,
            tcd1IconUrl,
        )
            .signAndSubmit(identity1)
            .subscribe({
                complete: () => done(),
                error: e => done(new Error(JSON.stringify(e))),
        })
    })

    it('(1) query for valid token', function(done) {
        this.timeout(15000)

        radixTokenManager.getTokenDefinition(TCD1_URI).then(tokenClass => {
            expect(tokenClass.symbol).to.eq(tcd1Symbol)
            expect(tokenClass.name).to.eq(tcd1Name)
            expect(tokenClass.description).to.eq(tcd1Description)
            expect(tokenClass.getGranularity().toString()).to.eq(tcd1Granularity.toString())
            expect(tokenClass.totalSupply.toString()).to.eq(RadixTokenDefinition.fromDecimalToSubunits(tcd1Amount).toString())
            
            done()
        }).catch(done)
    })

    it('(2) query invalid token', function(done) {
        radixTokenManager.getTokenDefinition('what even is this').then(tokenClass => {
            done(new Error('Shoudld not have found a token class'))
        }).catch(error => {
            expect(error.message).to.include('RRI must be of the format')
            done()
        })
    })

    it('(3) observing a token mint', function(done) {
        this.timeout(15000)

        
        radixTokenManager.getTokenDefinitionObservable(TCD1_URI).then(tokenClassObservable => {
            const expectedAmount = tcd1Amount + tcd1ExtraAmount
            
            const subscription = tokenClassObservable.subscribe(
                tokenClass => {
                    logger.debug('mint detected: ' + RadixTokenDefinition.fromSubunitsToDecimal(tokenClass.totalSupply))
                    if (RadixTokenDefinition.fromSubunitsToDecimal(tokenClass.totalSupply).eq(expectedAmount)) {
                        subscription.unsubscribe()
                        done()
                    }
                }
            )

            new RadixTransactionBuilder().mintTokens(
                identity1.account,
                TCD1_URI,
                tcd1ExtraAmount,
            ).signAndSubmit(identity1)
            .subscribe({
                error: e => done(new Error(JSON.stringify(e))),
            })
        }).catch(done)
    })


    it('(4) observing a token burn', function(done) {
        this.timeout(15000)

        
        radixTokenManager.getTokenDefinitionObservable(TCD1_URI).then(tokenClassObservable => {
            const expectedAmount = tcd1Amount + tcd1ExtraAmount - tcd1BurnAmount
            
            const subscription = tokenClassObservable.subscribe(
                tokenClass => {
                    if (RadixTokenDefinition.fromSubunitsToDecimal(tokenClass.totalSupply).eq(expectedAmount)) {
                        subscription.unsubscribe()
                        done()
                    }
                }
            )

            new RadixTransactionBuilder().burnTokens(
                identity1.account,
                TCD1_URI,
                tcd1BurnAmount,
            ).signAndSubmit(identity1)
            .subscribe({
                error: e => done(new Error(JSON.stringify(e))),
            })
        }).catch(done)
    })


    it('(5) query invalid token', function(done) {
        radixTokenManager.getTokenDefinition(TCD1_URI + 's').then(tokenClass => {
            done(new Error('Shoudld not have found a token class'))
        }).catch(error => {
            expect(error.message).to.include('Token definition does not exist in the accoun')
            done()
        })
    })

})
