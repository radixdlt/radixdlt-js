import 'mocha'
import { expect } from 'chai'

import BN from 'bn.js'
import Decimal from 'decimal.js'

import { RadixTokenClass } from './RadixTokenClass'
import { RadixAddress } from '../atommodel'

import { radixUniverse, RadixUniverse } from '../../'

before(() => {
    // Bootstrap the universe
    radixUniverse.bootstrap(RadixUniverse.LOCAL)
})

describe('Radix Token sample', () => {

    // const address = new RadixAddress()
    const address = RadixAddress.generateNew()
    const testToken = new RadixTokenClass(address, 'TEST')

    it('turn the decimal 1 to tokens', () => { 
        expect(testToken.fromDecimalToSubunits(1).toString()).to.deep.equal(new BN(10).pow(new BN(18)).toString())
    })

    it('turn the decimal 0.00013 to tokens', () => {
        expect(testToken.fromDecimalToSubunits(0.00013)).to.deep.equal(new BN('130000000000000'))
    })

    it('turn 13 units of the token into its decimal equivalence', () => {
        expect(testToken.fromSubunitsToDecimal(new BN('130000000000000'))).to.deep.equal(new Decimal(0.00013))
    })

})

