import { expect } from 'chai'
import 'mocha'

import { RadixTokenClass } from '../RadixAtomModel'

describe('Radix Token sample', () => {
    it('Turn the decimal 0.00013 to tokens', () => {
        expect(testToken.toToken(0.00013)).equals(13)
    })
    it('Turn 13 units of the token into its decimal equivalence', () => {
        expect(testToken.toDecimal(13)).equal(0.00013)
    })
})

const testToken = new RadixTokenClass({
    iso: 'TEST',
    sub_units: 100000
})
