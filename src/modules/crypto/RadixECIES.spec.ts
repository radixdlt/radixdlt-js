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

import 'mocha'
import { expect } from 'chai'
import RadixIdentityManager from '../identity/RadixIdentityManager'
import KeyPair from './KeyPair'
import RadixECIES from './RadixECIES'

describe('Multisig ECIES encryption', () => {

    const identityManager = RadixIdentityManager.byCreatingNewIdentity()


    it('should be able to encrypt and decrypt a message', () => {
        const alice = KeyPair.generateNew()

        const payload = 'test'

        const encrypted = RadixECIES.encrypt(
            alice.publicKey,
            Buffer.from(payload),
        )

        const decrytped = RadixECIES.decrypt(alice.privateKey, encrypted).toString()

        expect(decrytped).to.deep.equal(payload)
    })

    it('should be able to encrypt and decrypt a message for mutiple recipients with protectors', () => {
        const alice = KeyPair.generateNew()
        const bob = KeyPair.generateNew()

        const payload = 'test'
        const recipients = [alice, bob].map(kp => kp.publicKey)

        const {protectors, ciphertext} = RadixECIES.encryptForMultiple(
            recipients,
            Buffer.from(payload),
        )

        const decryptUsing = (keyPair: KeyPair): string => {
            return RadixECIES.decryptWithProtectors(
                keyPair.privateKey,
                protectors,
                ciphertext,
            ).toString()
        }

        // Alice can decrypt
        expect(decryptUsing(alice)).to.deep.equal(payload)

        // Bob can decrypt
        expect(decryptUsing(bob)).to.deep.equal(payload)
    })


})
