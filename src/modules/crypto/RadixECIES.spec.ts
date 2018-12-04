import { expect } from 'chai'
import 'mocha'

import {RadixAddress} from '../atommodel'

import { logger } from '../common/RadixLogger'

describe('Multisig ECIES encryption', () => {
    it('should be able to encrypt and decrypt a message', () => {
        // Generate myself a new address
        const myKeyPair = RadixAddress.generateNew()

        const otherKeyPair = RadixAddress.generateNew()

        const payload = 'test'

        const recipients = [myKeyPair, otherKeyPair]


        // TODO: Fix this test
        // const atom = RadixApplicationPayloadAtom.withEncryptedPayload(
        //     payload,
        //     recipients,
        //     'radix-messaging'
        // )

        // // Decrypt with my address
        // const decryptedPayload = atom.getDecryptedPayload(myKeyPair)

        // expect(decryptedPayload).to.equal(payload)
    })
})
