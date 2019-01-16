import { expect } from 'chai'
import 'mocha'
import { RadixIdentityManager, RadixTransactionBuilder } from '../..'
import { RadixAtom, RadixAddress } from '../atommodel'

describe('RadixSimpleIdentity', () => {

    it('different identities leave different signatures on atom', async () => {
        const atom1 = new RadixAtom()
        const atom2 = new RadixAtom()
        const manager = new RadixIdentityManager()
        const identity1 = manager.generateSimpleIdentity()
        const identity2 = manager.generateSimpleIdentity()

        await identity1.signAtom(atom1)
        await identity2.signAtom(atom2)

        const signature1 = atom1.signatures[identity1.address.getUID().toString()]
        const signature2 = atom2.signatures[identity2.address.getUID().toString()]

        expect(signature2).to.not.deep.equal(signature1)
    })

    it('identities from same seed leave same signature on atom', async () => {
        const seed = 'abc'
        const atom1 = new RadixAtom()
        const atom2 = new RadixAtom()
        const manager = new RadixIdentityManager()
        const identity1 = manager.generateSimpleIdentityFromSeed(Buffer.from(seed))
        const identity2 = manager.generateSimpleIdentityFromSeed(Buffer.from(seed))

        await identity1.signAtom(atom1)
        await identity2.signAtom(atom2)

        const signature1 = atom2.signatures[identity1.address.getUID().toString()]
        const signature2 = atom2.signatures[identity2.address.getUID().toString()]

        expect(signature2).to.deep.equal(signature1)
    })

    it('signature of seeded identity can be verified OK', async () => {
        const seed = 'def'
        const atom1 = new RadixAtom()
        const atom2 = new RadixAtom()
        const manager = new RadixIdentityManager()
        const identity1 = manager.generateSimpleIdentityFromSeed(Buffer.from(seed))
        const identity2 = manager.generateSimpleIdentityFromSeed(Buffer.from(seed))

        await identity1.signAtom(atom1)
        await identity2.signAtom(atom2)

        const signature2 = atom2.signatures[identity2.address.getUID().toString()]

        // Since identity2 should be the same as identity1, identity2's signature
        // should also be verified OK on atom1, even though the atom was signed
        // with identity1.
        expect(identity1.address.verify(atom1.getHash(), signature2)).to.equal(true)
    })

})
