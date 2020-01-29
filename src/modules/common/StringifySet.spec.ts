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
import { StringifySet } from './StringifySet';


class TestStringObject {
    constructor(readonly s: string) {
        //
    }

    public toString() {
        return this.s
    }
}


describe('StringifySet', () => {
    it('should add multiple items individually', () => {
        const set = new StringifySet<TestStringObject>()

        const s1 = new TestStringObject('t1')
        const s2 = new TestStringObject('t2')

        set.add(s1)
        set.add(s2)

        expect(set.values()).to.deep.equal([s1, s2])
    })

    it('should add multiple items at once', () => {
        const set = new StringifySet<TestStringObject>()

        const s1 = new TestStringObject('t1')
        const s2 = new TestStringObject('t2')

        set.addAll([s1, s2])

        expect(set.values()).to.deep.equal([s1, s2])
    })

    it('should preserve order', () => {
        const set = new StringifySet<TestStringObject>()

        const s1 = new TestStringObject('t1')
        const s2 = new TestStringObject('t2')

        set.addAll([s2, s1])

        expect(set.values()).to.deep.equal([s2, s1])
    })

    it('should only add non-unique items once', () => {
        const set = new StringifySet<TestStringObject>()

        const s1 = new TestStringObject('t1')
        const s2 = new TestStringObject('t2')
        const s3 = new TestStringObject('t2')

        set.addAll([s1, s2, s3])

        expect(set.values()).to.deep.equal([s1, s2])
    })

    it('should remove items', () => {
        const set = new StringifySet<TestStringObject>()

        const s1 = new TestStringObject('t1')
        const s2 = new TestStringObject('t2')

        set.addAll([s1, s2])
        set.remove(s1)

        expect(set.values()).to.deep.equal([s2])
    })
})
