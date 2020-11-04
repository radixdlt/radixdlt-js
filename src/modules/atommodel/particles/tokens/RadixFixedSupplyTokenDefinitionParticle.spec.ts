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

import {
    RadixAddress,
    RRI,
    RadixFixedSupplyTokenDefinitionParticle,
} from '../..'
import { generateNewAddressWithRandomMagic } from '../../primitives/RadixAddress.spec'

describe('RadixFixedSupplyTokenDefinitionParticle', () => {
    const address = generateNewAddressWithRandomMagic()
    const name = 'test token'
    const symbol = 'TEST'
    const description = 'very testy token'
    const supply = new BN(1000000)
    const granularity = new BN(1)
    const tokenUrl = 'http://a.b.com'
    const iconUrl = 'http://image.com'

    const particle = new RadixFixedSupplyTokenDefinitionParticle(
        address,
        name,
        symbol,
        description,
        supply,
        granularity,
        tokenUrl,
        iconUrl,
    )

    it(`should compute hid`, () => {
        expect(particle.getHid.bind(particle)).to.not.throw()
    })

    it(`should get addresses`, () => {
        expect(particle.getAddresses()).to.deep.equal([address])
    })

    it(`should get rri`, () => {
        expect(particle.getRRI()).to.deep.equal(new RRI(address, symbol))
    })
})
