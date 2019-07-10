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
