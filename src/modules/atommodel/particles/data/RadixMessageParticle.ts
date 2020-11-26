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

import { RadixSerializer, includeJSON, includeDSON, RadixParticle, RadixAddress, RadixBytes } from '../..'
import { createNonce } from '../../primitives/Nonce'

/**
 * Particle which can hold arbitrary data
 */
@RadixSerializer.registerClass('radix.particles.message')
export class RadixMessageParticle extends RadixParticle {

    @includeJSON
    @includeDSON
    public from: RadixAddress

    @includeJSON
    @includeDSON
    public to: RadixAddress
    
    @includeDSON
    @includeJSON
    public metaData: {[s: string]: string}

    @includeDSON
    @includeJSON
    public bytes: RadixBytes

    @includeDSON
    @includeJSON
    public nonce: number

    constructor(from: RadixAddress, to: RadixAddress, data: any, metaData: { [s: string]: string }, nonce?: number) {
        super()
        this.from = from
        this.to = to
        this.bytes = new RadixBytes(data)
        this.metaData = metaData
        this.nonce = nonce ? nonce : createNonce()
    }

    public getAddresses() {
        return [this.from, this.to]
    }

    public getData() {
        return this.bytes
    }

    public getMetaData(key: string) {
        const metaData = this.metaData

        if (metaData && key in metaData) {
            return metaData[key]
        }

        return null
    }

    public getNonce() {
        return this.nonce
    }

}
