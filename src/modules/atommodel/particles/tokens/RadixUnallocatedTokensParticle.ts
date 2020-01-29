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

import {
    includeDSON,
    includeJSON,
    RadixSerializer,
    RadixParticle,
    RadixAddress,
    RadixUInt256,
    RRI,
    RadixOwnable,
    RadixFungible,
    RadixConsumable,
    RadixTokenPermissions,
} from '../..'

import BN from 'bn.js'

/**
 *  A particle which represents an amount of unallocated tokens which can be minted.
 */
@RadixSerializer.registerClass('radix.particles.unallocated_tokens')
export class RadixUnallocatedTokensParticle extends RadixParticle implements RadixOwnable, RadixFungible, RadixConsumable {

    @includeDSON
    @includeJSON
    public tokenDefinitionReference: RRI

    @includeDSON
    @includeJSON
    public granularity: RadixUInt256

    @includeDSON
    @includeJSON
    public nonce: number

    @includeDSON
    @includeJSON
    public amount: RadixUInt256

    @includeDSON
    @includeJSON
    public permissions: RadixTokenPermissions

    constructor(
        amount: BN,
        granularity: BN,
        nonce: number,
        tokenReference: RRI,
        tokenPermissions: RadixTokenPermissions,
    ) {
        if (amount.isZero()) {
            throw new Error('Ammount cannot be zero')
        }

        super()
        
        this.granularity = new RadixUInt256(granularity)
        this.tokenDefinitionReference = tokenReference
        this.amount = new RadixUInt256(amount)
        this.nonce = nonce
        this.permissions = tokenPermissions
    }

    public getAddress() {
        return this.tokenDefinitionReference.address
    }

    public getAddresses() {
        return [this.tokenDefinitionReference.address]
    }

    public getNonce() {
        return this.nonce
    }

    public getTokenDefinitionReference() {
        return this.tokenDefinitionReference
    }

    public getOwner() {
        return this.getAddress()
    }

    public getAmount() {
        return this.amount.value
    }

    public getGranularity(): BN {
        return this.granularity.value
    }

    public getTokenPermissions() {
        return this.permissions
    }
}
