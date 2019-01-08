import { expect } from 'chai'
import 'mocha'
import BN from 'bn.js'
import { RadixTokenClass } from './RadixTokenClass';
import Decimal from 'decimal.js';
import { RadixAddress } from '../atommodel';

describe('Radix Token sample', () => {

    const address = new RadixAddress()
    const testToken = new RadixTokenClass(address, 'TEST')

    it('Turn the decimal 1 to tokens', () => {
        expect(testToken.fromDecimalToSubunits(1).toString()).to.deep.equal(new BN(10).pow(new BN(18)).toString())
    })


    it('Turn the decimal 0.00013 to tokens', () => {
        expect(testToken.fromDecimalToSubunits(0.00013)).to.deep.equal(new BN('130000000000000'))
    })
    it('Turn 13 units of the token into its decimal equivalence', () => {
        expect(testToken.fromSubunitsToDecimal(new BN('130000000000000'))).to.deep.equal(new Decimal(0.00013))
    })
})

