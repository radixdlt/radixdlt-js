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

const id = ':uid:'
@RadixSerializer.registerPrimitive(id)
export class RadixEUID implements RadixPrimitive {

    public readonly bytes: Buffer

    constructor(value: number | Buffer | number[] | string) {

        if (typeof value === 'number') {
            this.bytes = Buffer.alloc(16)
            this.bytes.writeUInt32BE(value, 12)
        } else if (Buffer.isBuffer(value) || Array.isArray(value)) {
            if (value.length === 0) {
                throw new Error('EUID must not be 0 bytes')
            }

            this.bytes = Buffer.from(value as Buffer)
        } else if (typeof value === 'string') {
            this.bytes = Buffer.from(value, 'hex')
        } else {
            throw new Error('Unsupported EUID value')
        }
    }

    public static fromJSON(data: string) {
        return new this(data)
    }

    public toJSON() {
        return `${id}${this.bytes.toString('hex')}`
    }

    public toDSON(): Buffer {
        return RadixSerializer.toDSON(this)
    }

    public encodeCBOR(encoder) {
        const output = Buffer.alloc(this.bytes.length + 1)
        output.writeInt8(0x02, 0)
        this.bytes.copy(output, 1)

        return encoder.pushAny(output)
    }


    public equals(euid: RadixEUID) {
        return this.bytes.compare(euid.bytes) === 0
    }

    public toString(): string {
        return this.bytes.toString('hex')
    }
}
