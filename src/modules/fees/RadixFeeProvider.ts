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

import BN from 'bn.js'

import RadixNodeConnection from '../universe/RadixNodeConnection'
import RadixPOWTask from '../pow/RadixPOWTask'
import { RadixAtom } from '../atommodel'
import { powTargetFromAtomSize, RadixPOW } from '../..'


export default class RadixFeeProvider {
    /**
     * Compute a valid POW nonce for an atom
     * 
     * @param  {number} universeMagicNumber A universe-specific number defined in the unvierse config
     * @param  {RadixAtom} atom The atom without a pow fee
     * @returns Promise
     */
    
    public static async generatePOWFee(
        universeMagicNumber: number,
        atom: RadixAtom,
    ): Promise<RadixPOW> {

        // Compute difficulty, make a target buffer with first n bits set to 0
        // const target = powTargetFromAtomSize(atom.getSize())
        const target = Buffer.from('0000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF', 'hex')

        // Make seed
        const seed = atom.getHash()

        // POW
        const powTask = new RadixPOWTask(universeMagicNumber, seed, target)
        const pow = await powTask.computePow()

        return pow
    }
}
