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

import { RadixSerializer, RadixPrimitive } from '..'
import BN from 'bn.js'

const id = ':u20:'
@RadixSerializer.registerPrimitive(id)
export class RadixUInt256 implements RadixPrimitive {

    public readonly value: BN

    constructor(value: number | string | BN) {
        this.value = new BN(value)
    }

    public static fromJSON(encoded: string) {
        return new this(new BN(encoded, 10))
    }

    public toJSON() {
        return `${id}${this.value.toString(10)}`
    }

    public toDSON(): Buffer {
        return RadixSerializer.toDSON(this)
    }

    public encodeCBOR(encoder) {
        const encoded = this.value.toArrayLike(Buffer, 'be', 32)

        const output = Buffer.alloc(encoded.length + 1)
        output.writeInt8(0x05, 0)
        encoded.copy(output, 1)

        return encoder.pushAny(output)
    }

    public toString() {
        return this.value.toString(10)
    }

    public getValue() {
        return this.value
    }
}
