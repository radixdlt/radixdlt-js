import 'mocha'
import { expect } from 'chai'

import RadixECIES from './RadixECIES';
import { RadixIdentityManager, radixUniverse, RadixUniverse } from '../..';

describe('Multisig ECIES encryption', () => {

    before(() => {
        // Bootstrap the universe
        radixUniverse.bootstrap(RadixUniverse.LOCAL)
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
