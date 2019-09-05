import { expect } from 'chai'
import 'mocha'
import { RadixIdentityManager, RadixTransactionBuilder, RadixAccount, RadixAtomNodeStatus } from '../..'
import { RadixAtom, RadixAddress } from '../atommodel'
import { RadixNEDBAtomStore } from './RadixNEDBAtomStore';

describe('RadixNEDBAtomStore', () => {

    it('should not insert twice', async () => {
        const atomStore = new RadixNEDBAtomStore({inMemoryOnly: true})

        const alice = new RadixAccount(RadixAddress.generateNew())

        const atom1 = RadixTransactionBuilder
            .createRadixMessageAtom(alice, alice, 'Self')
            .buildAtom()

        
        return atomStore.insert(atom1, {status: RadixAtomNodeStatus.STORED}).then((inserted) => {
            expect(inserted).to.be.true

            return atomStore.insert(atom1, {status: RadixAtomNodeStatus.STORED})
        }).then((inserted) => {
            expect(inserted).to.be.false
        })
    })

    it('should query all atoms', (done) => {
        const atomStore = new RadixNEDBAtomStore({inMemoryOnly: true})

        const alice = new RadixAccount(RadixAddress.generateNew())
        const bob = new RadixAccount(RadixAddress.generateNew())

        const atom1 = RadixTransactionBuilder
            .createRadixMessageAtom(alice, alice, 'Self')
            .buildAtom()

        const atom2 = RadixTransactionBuilder
            .createRadixMessageAtom(alice, bob, 'To bob')
            .buildAtom()

        
        atomStore.insert(atom1, {status: RadixAtomNodeStatus.STORED})
        .then((inserted) => {
            expect(inserted).to.be.true

            return atomStore.insert(atom2, {status: RadixAtomNodeStatus.STORED})
        }).then((inserted) => {
            expect(inserted).to.be.true

            const atoms = []

            atomStore.getStoredAtomObservations().subscribe({
                next: (atom) => {
                    atoms.push(atom)
                },
                complete: () => {
                    expect(atoms).to.be.of.length(2)
                    done()
                }
            })
        })
    })

    it('should query atoms by addresses', (done) => {
        const atomStore = new RadixNEDBAtomStore({inMemoryOnly: true})

        const alice = new RadixAccount(RadixAddress.generateNew())
        const bob = new RadixAccount(RadixAddress.generateNew())

        const atom1 = RadixTransactionBuilder
            .createRadixMessageAtom(alice, alice, 'Self')
            .buildAtom()

        const atom2 = RadixTransactionBuilder
            .createRadixMessageAtom(alice, bob, 'To bob')
            .buildAtom()

        
        atomStore.insert(atom1, {status: RadixAtomNodeStatus.STORED})
        .then((inserted) => {
            expect(inserted).to.be.true

            return atomStore.insert(atom2, {status: RadixAtomNodeStatus.STORED})
        }).then((inserted) => {
            expect(inserted).to.be.true

            const aliceAtoms = []

            atomStore.getStoredAtomObservations(alice.address).subscribe({
                next: (atom) => {
                    aliceAtoms.push(atom)
                },
                complete: () => {
                    expect(aliceAtoms).to.be.of.length(2)
                    done()
                }
            })
        })
    })

})
