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
import { RadixAID, RadixHash } from '..';
import Long from 'long'
import { radixHash } from '../../common/RadixUtil';

describe('RadixAID', () => {

    it('should select the correct shard', () => {
        const hashBytes = []
        for (let i = 0; i < 32; i++) {
            hashBytes.push(i + 3)
        }
        const hash = Buffer.from(hashBytes)
        const shards = [Long.fromNumber(1), Long.fromNumber(2)]

        const aid = RadixAID.from(hash, shards)

        // first byte of hash is 3 so 3 % 2 shards = 1 -> second shard should be selected
        expect(aid.getShard().compare(shards[1])).to.equal(0)
    })

    

})
