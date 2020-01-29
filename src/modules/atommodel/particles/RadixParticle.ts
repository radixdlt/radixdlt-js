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

import { RadixSerializableObject, RadixSerializer, includeJSON, includeDSON, RadixAddress, RadixEUID } from '..'
import { StringifySet } from '../../common/StringifySet'

@RadixSerializer.registerClass('radix.particle')
export class RadixParticle extends RadixSerializableObject {

    constructor() {
        super()
    }

    public getAddresses(): RadixAddress[] {
        throw new Error('Particle implementations must override this method!')
    }

    public getHid() {
        return new RadixEUID(this.getHash().slice(0, 16))
    }

    public getHidString() {
        return this.getHid().toString()
    }

    public getDestinations() {
        return StringifySet.of(this.getAddresses().map(a => a.getUID())).values()
    }

    @includeJSON
    @includeDSON
    get destinations() {
        return this.getDestinations()
    }

    set destinations(destinations: RadixEUID[]) {
        // Ignore, since it's a computed property
    }
}
