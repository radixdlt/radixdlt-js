import { expect } from 'chai'
import 'mocha'
import { RadixAID, RadixHash } from '..';
import Long from 'long'
import { radixHash } from '../../common/RadixUtil';

describe('RadixAID', () => {

    it('should select the correct shard', () => {
        const hashBytes = []
        for (let i = 0; i < 32; i++) {
            hashBytes.push(i + 3)
        }
        const hash = Buffer.from(hashBytes)
        const shards = [Long.fromNumber(1), Long.fromNumber(2)]

        const aid = RadixAID.from(hash, shards)

        // first byte of hash is 3 so 3 % 2 shards = 1 -> second shard should be selected
        expect(aid.getShard().compare(shards[1])).to.equal(0)
    })

    

})
