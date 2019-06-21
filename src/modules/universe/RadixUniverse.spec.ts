import { expect } from 'chai'
import 'mocha'

import RadixUniverse from '../universe/RadixUniverse'


describe('Radix Universe', () => {
    it('resolveNodeName function should support IPv4', () => {
        expect(RadixUniverse.resolveNodeName("127.0.0.1")).to.equal("az8kflt.radixnode.net")
        expect(RadixUniverse.resolveNodeName("128.0.0.1")).to.equal("azik0zl.radixnode.net")
    })
    it('resolveNodeName function should not break by unsupported IPv6 addresses', () => {
        expect(RadixUniverse.resolveNodeName("::1")).to.equal("[::1]")
    })
    it('resolveNodeName function should let hostnames through without modification', () => {
        expect(RadixUniverse.resolveNodeName("foo")).to.equal("foo")
    })
    it('BETANET config should access nodes directly by DNS name', () => {
        const cfg = RadixUniverse.BETANET
        expect(cfg.nodeDiscovery.wsAddress("127.0.0.1", 443)).to.equal("wss://az8kflt.radixnode.net/rpc")
        expect(cfg.nodeDiscovery.httpAddress("127.0.0.1", 443))
            .to.equal("https://az8kflt.radixnode.net/rpc")
    })
})
