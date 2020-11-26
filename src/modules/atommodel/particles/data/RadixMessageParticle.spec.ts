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

import { expect } from 'chai'
import 'mocha'
import { RadixAddress, RadixMessageParticle } from '../..'
import { RadixUniverse, radixUniverse } from '../../../..'


describe('RadixMessageParticle', () => {

    before(async function() {
        await radixUniverse.bootstrapTrustedNode(RadixUniverse.LOCAL_SINGLE_NODE)
    })

    it(`should work`, function() {

        const from = RadixAddress.generateNew()
        const to = RadixAddress.generateNew()
        const data = 'abc'
        const metaData = {a: 'b'}
        const addresses = [from, to]

        const particle = new RadixMessageParticle(from, to, data, metaData)

        it(`should compute hid`, () => {
            expect(particle.getHid.bind(particle)).to.not.throw()
        })

        it(`should get data`, () => {
            expect(particle.getData().toString()).to.equal(data)
        })
    
        it(`should get addresses`, () => {
            expect(particle.getAddresses()).to.deep.equal(addresses)
        })
    })

    
})
