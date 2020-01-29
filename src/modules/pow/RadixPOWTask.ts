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

import RadixPOW from './RadixPOW'

import { logger } from '../common/RadixLogger'

export default class RadixPOWTask {
    public pow: RadixPOW

    constructor(
        readonly magic: number,
        readonly seed: Buffer,
        readonly target: Buffer,
    ) {
        this.pow = new RadixPOW(magic, seed)
    }

    public computePow() {
        return new Promise<RadixPOW>((resolve, reject) => {
            this.attemptPow(resolve)
        })
    }

    

    public attemptPow(callback: (pow: RadixPOW) => void) {
        for (let i = 0; i < 1000; i++) {
            this.pow.incrementNonce()
            const hash = this.pow.getHash()

            if (this.meetsTarget(hash)) {
                setTimeout(() => {
                    callback(this.pow)
                })

                return
            }
        }

        // Non-blocking
        setTimeout(() => {
            this.attemptPow(callback)
        }, 0)
    }

    public meetsTarget(hash: Buffer) {
        return hash.compare(this.target) < 0
    }
}
