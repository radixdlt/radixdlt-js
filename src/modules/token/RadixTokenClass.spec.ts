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

    it('turn the decimal 1 to tokens', () => { 
        expect(RadixTokenClass.fromDecimalToSubunits(1).toString()).to.deep.equal(new BN(10).pow(new BN(18)).toString())
    })

    it('turn the decimal 0.00013 to tokens', () => {
        expect(RadixTokenClass.fromDecimalToSubunits(0.00013)).to.deep.equal(new BN('130000000000000'))
    })

    it('turn 13 units of the token into its decimal equivalence', () => {
        expect(RadixTokenClass.fromSubunitsToDecimal(new BN('130000000000000'))).to.deep.equal(new Decimal(0.00013))
    })


    it('turn the decimal 9999 to token units', () => {
        expect(RadixTokenClass.fromDecimalToSubunits(9999)).to.deep.equal(new BN('9999000000000000000000'))
    })

    it('turn the decimal 9999 to tokens', () => {
        expect(RadixTokenClass.fromSubunitsToDecimal(new BN('9999000000000000000000'))).to.deep.equal(new Decimal(9999))
    })

})
