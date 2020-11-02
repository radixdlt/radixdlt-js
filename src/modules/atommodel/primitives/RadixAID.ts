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

import { RadixSerializer, RadixPrimitive } from '..';

const id = ':aid:'
@RadixSerializer.registerPrimitive(id)
export class RadixAID implements RadixPrimitive {

    public static BYTES = 32
    public static HASH_BYTES = 32

    private bytes: Buffer

    public constructor(bytes: Buffer) {
        if (bytes.length !== RadixAID.BYTES) {
            throw new Error(`Bytest lenght must be ${RadixAID.BYTES} but is ${bytes.length}`)
        }

        this.bytes = Buffer.from(bytes)
    }


    public static from(hash: Buffer) {
        const bytes = Buffer.alloc(this.BYTES)
        hash.copy(bytes, 0, 0, this.HASH_BYTES)

        return new this(bytes)
    }


    public static fromJSON(data: string) {
        return new this(Buffer.from(data, 'hex'))
    }

    public toJSON() {
        return `${id}${this.bytes.toString('hex')}`
    }

    public toDSON(): Buffer {
        return RadixSerializer.toDSON(this)
    }

    public encodeCBOR(encoder) {
        const output = Buffer.alloc(this.bytes.length + 1)
        output.writeInt8(0x08, 0)
        this.bytes.copy(output, 1)

        return encoder.pushAny(output)
    }


    public equals(aid: RadixAID) {
        return this.bytes.compare(aid.bytes) === 0
    }

    public toString(): string {
        return this.bytes.toString('hex')
    }
}
