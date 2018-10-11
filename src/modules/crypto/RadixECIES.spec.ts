import { expect } from 'chai'
import 'mocha'

import { RadixApplicationPayloadAtom, RadixKeyPair } from '../RadixAtomModel'

describe('Multisig ECIES encryption', () => {
    it('should be able to encrypt and decrypt a message', () => {
        // Generate myself a new address
        const myKeyPair = RadixKeyPair.generateNew()

        const otherKeyPair = RadixKeyPair.generateNew()

        const payload = 'test'

        const recipients = [myKeyPair, otherKeyPair]

        const atom = RadixApplicationPayloadAtom.withEncryptedPayload(
            payload,
            recipients,
            'radix-messaging'
        )

        // Decrypt with my address
        const decryptedPayload = atom.getDecryptedPayload(myKeyPair)
        console.log(decryptedPayload)
        expect(decryptedPayload).to.equal(payload)
    })
})
