import { RadixNodeInfo } from '../..';
import Long from 'long';

export default class RadixNode {
    constructor(readonly nodeInfo: RadixNodeInfo, readonly wsAddress: string, readonly httpAddress: string) {}

    public canServiceShard(shard: Long): boolean {
        if (this.nodeInfo.system) {
            const low = Long.fromValue(this.nodeInfo.system.shards.low)
            const high = Long.fromValue(this.nodeInfo.system.shards.high)

            if (high.lessThan(low)) {
                // Wrap around
                return (
                    shard.greaterThanOrEqual(low) || shard.lessThanOrEqual(high)
                )
            } else {
                return (
                    shard.greaterThanOrEqual(low) && shard.lessThanOrEqual(high)
                )
            }
        }

        return false
    }
}
