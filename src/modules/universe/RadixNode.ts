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

import { RadixNodeSystem } from '../..';
import Long from 'long';

export default class RadixNode {
    public static SHARD_CHUNK_HALF_RANGE = Long.fromValue(1).shl(43)

    constructor(readonly nodeInfo: RadixNodeSystem, readonly wsAddress: string, readonly httpAddress: string) {}

    public canServiceShard(shard: Long): boolean {
        const remainder = shard.mod(RadixNode.SHARD_CHUNK_HALF_RANGE)

        if (this.nodeInfo) {
            const low = Long.fromValue(this.nodeInfo.shards.range.low)
            const high = Long.fromValue(this.nodeInfo.shards.range.high)

            if (high.lessThan(low)) {
                // Wrap around
                return (
                    remainder.greaterThanOrEqual(low) || remainder.lessThanOrEqual(high)
                )
            } else {
                return (
                    remainder.greaterThanOrEqual(low) && remainder.lessThanOrEqual(high)
                )
            }
        }

        return false
    }
}
