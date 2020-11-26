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

import { includeDSON, includeJSON, RadixAddress, RadixParticle, RadixSerializer, RRI } from '..'
import { createNonce } from '../primitives/Nonce'

@RadixSerializer.registerClass('radix.particles.unique')
export class RadixUniqueParticle extends RadixParticle {

    @includeDSON
    @includeJSON
    public name: string

    @includeDSON
    @includeJSON
    public address: RadixAddress

    @includeDSON
    @includeJSON
    public nonce: number

    constructor(
        address: RadixAddress,
        unique: string,
        nonce: number = createNonce(),
    ) {
        super()

        this.address = address
        this.name = unique
        this.nonce = nonce
    }

    public getAddresses() {
        return [this.address]
    }

    public getRRI() {
        return new RRI(this.address, this.name)
    }
}
