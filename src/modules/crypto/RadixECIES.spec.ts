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

import RadixECIES from './RadixECIES';
import { RadixIdentityManager, radixUniverse, RadixUniverse } from '../..';

describe('Multisig ECIES encryption', () => {

    before(async () => {
        // Bootstrap the universe
        await radixUniverse.bootstrapTrustedNode(RadixUniverse.LOCAL_SINGLE_NODE)
    })

    const identityManager = new RadixIdentityManager()
    

    it('should be able to encrypt and decrypt a message', () => {
        const myIdentity = identityManager.generateSimpleIdentity()
        const otherIdentity = identityManager.generateSimpleIdentity()

        const payload = 'test'

        const encrypted = RadixECIES.encrypt(
            myIdentity.account.address.getPublic(),
            Buffer.from(payload),
        )

        const decrytped = RadixECIES.decrypt(myIdentity.address.getPrivate(), encrypted).toString()

        expect(decrytped).to.deep.equal(payload)
    })

    it('should be able to encrypt and decrypt a message for mutiple recipients with protectors', () => {
        const myIdentity = identityManager.generateSimpleIdentity()
        const otherIdentity = identityManager.generateSimpleIdentity()
       
        const payload = 'test'
        const recipients = [myIdentity.account.address.getPublic(), otherIdentity.account.address.getPublic()]

        const {protectors, ciphertext} = RadixECIES.encryptForMultiple(recipients, Buffer.from(payload))

        // I can decrypt
        const decrytped1 = RadixECIES.decryptWithProtectors(myIdentity.address.getPrivate(), protectors, ciphertext).toString()
        expect(decrytped1).to.deep.equal(payload)

        // Other recipient can decrypt
        const decrytped2 = RadixECIES.decryptWithProtectors(otherIdentity.address.getPrivate(), protectors, ciphertext).toString()
        expect(decrytped2).to.deep.equal(payload)
    })


})
