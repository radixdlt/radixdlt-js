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

import { includeJSON, RadixBytes, RadixSerializableObject, RadixSerializer } from '..'
import BN from 'bn.js'
import EC from 'elliptic'
import asn1js from '@lapo/asn1js'

@RadixSerializer.registerClass('crypto.ecdsa_signature')
export class RadixECSignature extends RadixSerializableObject {
    
    @includeJSON 
    public r: RadixBytes

    @includeJSON
    public s: RadixBytes


    constructor(
        r: BN,
        s: BN,
    ) {
        super()

        // Change to store `r` and `s` as BN.
        this.r = new RadixBytes(r.toBuffer())
        this.s = new RadixBytes(s.toBuffer())
    }

    public static fromDER(der: string | Buffer): RadixECSignature {
        const derBuffer = (typeof der === 'string') ? Buffer.from(der) : der
        const derDecoded = asn1js.decode(derBuffer).content()
        // const derDecoded = asn.decode(der, 'der')
        const jsLibEllipticSignature = new EC.ec.Signature(derDecoded)
        return new RadixECSignature(
            jsLibEllipticSignature.r,
            jsLibEllipticSignature.s,
        )
    }

    public equals(other: RadixECSignature): boolean {
        return this.r.bytes.equals(other.r.bytes) && this.s.bytes.equals(other.s.bytes)
    }
}
