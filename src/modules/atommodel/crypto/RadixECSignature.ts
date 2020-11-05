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
// tslint:disable-next-line:no-submodule-imports
import ASN1 from '@lapo/asn1js/asn1'
// tslint:disable-next-line:no-submodule-imports
import Hex from '@lapo/asn1js/hex'
import { logger } from '../../..'

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

    public equals(other: RadixECSignature): boolean {
        return this.r.bytes.equals(other.r.bytes) && this.s.bytes.equals(other.s.bytes)
    }

    public static fromDER(der: string): RadixECSignature {
        const hexDecoded = Hex.decode(der)
        const decoded = ASN1.decode(hexDecoded)

        const stream = Buffer.from(decoded.stream.enc)
        if (!(stream instanceof Buffer)) {
            throw new Error(`ERROR expected Buffer but got type ${typeof stream}`)
        }

        let r: BN
        let s: BN

        for (const sub of decoded.sub) {
            const tagObj = sub.tag
            const tag = tagObj.tagNumber
            if (tag !== 2) {
                throw new Error(`Incorrect DER tag, should have been 2, but got: ${tag}`)
            }
            const headerLength = sub.header
            const offsetInStream = sub.stream.pos + headerLength
            const length = sub.length
            const endIndex = offsetInStream + length
            const buffer = stream.slice(offsetInStream, endIndex)
            if (buffer.length !== length) {
                throw new Error(`Incorrect buffer slicing, wrong length.`)
            }
            const decodedNumber = new BN(buffer)

            // Logic above is asserted correct by ugly code below, will remove it.
            //
            // const contentWithDescription: string = sub.content()
            // const contentStrings = contentWithDescription.split("bit)")
            // const numberFromContentAsString = contentStrings[1]
            // const contentString = numberFromContentAsString.trim()
            // const numberFromContentDescription = new BN(contentString, 10)
            //
            // if (!(numberFromContentDescription.eq(decodedNumber))) {
            //     throw new Error(`Decoded number: ${decodedNumber} != numberFromContentDescription: ${numberFromContentDescription}`)
            // }

            if (!r) {
                r = decodedNumber
            } else {
                s = decodedNumber
            }
        }

        return new RadixECSignature(
            r,
            s,
        )
    }
}
