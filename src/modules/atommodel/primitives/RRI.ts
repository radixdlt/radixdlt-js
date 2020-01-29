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

import {
    RadixSerializer,
    RadixPrimitive,
    RadixAddress,
} from '..'

const id = ':rri:'
@RadixSerializer.registerPrimitive(id)
export class RRI implements RadixPrimitive {

    public readonly address: RadixAddress
    public readonly name: string
    
    constructor(address: RadixAddress, name: string) {
        this.address = address
        this.name = name
    }

    public static fromJSON(uri: string) {
        return this.fromString(uri)
    }

    public static fromString(uri: string) {
        const parts = uri.split('/')

        if (parts.length !== 3) {
            throw new Error('RRI must be of the format /:address/:unique')
        }

        return new this(RadixAddress.fromAddress(parts[1]), parts[2])
    }

    public toJSON() {
        return `${id}${this.toString()}`
    }

    public toString() {
        return `/${this.address.toString()}/${this.name}`
    }

    public toDSON(): Buffer {
        return RadixSerializer.toDSON(this)
    }

    public encodeCBOR(encoder) {
        const s = Buffer.from(this.toString(), 'utf8')

        const output = Buffer.alloc(s.length + 1)
        output.writeInt8(0x06, 0)
        s.copy(output, 1)

        return encoder.pushAny(output)
    }

    public equals(rri: RRI) {
        return this.address.equals(rri.address) && this.name === rri.name
    }

    public getAddress() {
        return this.address
    }

    public getName() {
        return this.name
    }
}
