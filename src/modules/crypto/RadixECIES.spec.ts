import 'mocha'
import { expect } from 'chai'

import RadixECIES from './RadixECIES';
import { RadixIdentityManager } from '../..';
import { RadixAddress } from '../atommodel';

describe('Multisig ECIES encryption', () => {

    const identityManager = new RadixIdentityManager()
    const myIdentity = identityManager.generateSimpleIdentity()
    const otherIdentity = identityManager.generateSimpleIdentity()

    it('should be able to encrypt and decrypt a message', () => {
        const payload = 'test'

        const encrypted = RadixECIES.encrypt(
            myIdentity.account.address.getPublic(),
            Buffer.from(payload),
        )

        const decrytped = RadixECIES.decrypt(myIdentity.address.getPrivate(), encrypted).toString()

        expect(decrytped).to.deep.equal(payload)
    })

    it('should be able to encrypt and decrypt a message for mutiple recipients with protectors', () => {
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
