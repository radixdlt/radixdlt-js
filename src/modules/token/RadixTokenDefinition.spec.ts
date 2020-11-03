/*
 * (C) Copyright 2020 Radix DLT Ltd
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the “Software”),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

import 'mocha'
import { expect } from 'chai'

import BN from 'bn.js'
import Decimal from 'decimal.js'

import { RadixTokenDefinition } from './RadixTokenDefinition';


describe('Radix Token sample', () => {

    it('turn the decimal 1 to tokens', () => { 
        expect(RadixTokenDefinition.fromDecimalToSubunits(1).toString()).to.deep.equal(new BN(10).pow(new BN(18)).toString())
    })

    it('turn the decimal 0.00013 to tokens', () => {
        expect(RadixTokenDefinition.fromDecimalToSubunits(0.00013)).to.deep.equal(new BN('130000000000000'))
    })

    it('turn 13 units of the token into its decimal equivalence', () => {
        expect(RadixTokenDefinition.fromSubunitsToDecimal(new BN('130000000000000'))).to.deep.equal(new Decimal(0.00013))
    })


    it('turn the decimal 9999 to token units', () => {
        expect(RadixTokenDefinition.fromDecimalToSubunits(9999)).to.deep.equal(new BN('9999000000000000000000'))
    })

    it('turn the decimal 9999 to tokens', () => {
        expect(RadixTokenDefinition.fromSubunitsToDecimal(new BN('9999000000000000000000'))).to.deep.equal(new Decimal(9999))
    })

})
