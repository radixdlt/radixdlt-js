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

import { expect } from 'chai'
import 'mocha'

import RadixUniverse from '../universe/RadixUniverse'
import { RadixNodeDiscoveryFromNodeFinder } from '../..';


describe('Radix Universe', () => {
    it('resolveNodeName function should support IPv4', () => {
        expect(RadixUniverse.resolveNodeName('127.0.0.1')).to.equal('az8kflt.radixnode.net')
        expect(RadixUniverse.resolveNodeName('128.0.0.1')).to.equal('azik0zl.radixnode.net')
    })
    it('resolveNodeName function should not break by unsupported IPv6 addresses', () => {
        expect(RadixUniverse.resolveNodeName('::1')).to.equal('[::1]')
    })
    it('resolveNodeName function should let hostnames through without modification', () => {
        expect(RadixUniverse.resolveNodeName('foo')).to.equal('foo')
    })
    it('BETANET config should access nodes directly by DNS name', () => {
        const cfg = RadixUniverse.BETANET
        expect((cfg.nodeDiscovery as RadixNodeDiscoveryFromNodeFinder).wsAddress('127.0.0.1', 443)).to.equal('wss://az8kflt.radixnode.net/rpc')
        expect((cfg.nodeDiscovery as RadixNodeDiscoveryFromNodeFinder).httpAddress('127.0.0.1', 443))
            .to.equal('https://az8kflt.radixnode.net/rpc')
    })
})
