// import { expect } from 'chai'
// import 'mocha'

// import RadixApplicationPayloadAtom from '../atom/RadixApplicationPayloadAtom'
// import RadixKeyPair from '../wallet/RadixKeyPair'

// describe('Multisig ECIES encryption', () => {
//   it('should be able to encrypt and decrypt a message', () => {
//     // Can't do this test because mocha + ts-node doesn't do ES6 modules, but we need that because there are circular dependencies

//     // Generate myself a new address
//     let myKeyPair = RadixKeyPair.generateNew()

//     let otherKeyPair = RadixKeyPair.generateNew()

//     let payload = {
//       to: myKeyPair,
//       from: otherKeyPair,
//       content: 'test'
//     }

//     let recipients = [myKeyPair, otherKeyPair]

//     let atom = RadixApplicationPayloadAtom.withEncryptedPayload(
//       payload,
//       recipients,
//       'radix-messaging'
//     )

//     // Decrypt with my address
//     let decryptedPayload = atom.getDecryptedPayload(myKeyPair)
//     expect(decryptedPayload.content).to.equal(payload.content)
//     expect(decryptedPayload.to.getAddress()).to.equal(payload.to.getAddress())
//     expect(decryptedPayload.from.getAddress()).to.equal(
//       payload.from.getAddress()
//     )
//   })
// })
