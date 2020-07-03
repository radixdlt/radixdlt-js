import 'mocha'
import { expect } from 'chai'
import { RadixAtom } from 'radixdlt'
import { createTransferAction, createMessageAction, createUniqueAction } from './utils'
import { alice, bob, token, setupFinished, diana, clara } from './setup'
import { cborByteOffsets } from '../src/atomByteOffsetMetadata'

const expected1 = '01bb002901eb0023027b002602bb003d0346002903760023040600260446003d'
const expected2 = '01bb002901eb0023027b002602bb003d0346002903760023040600260446003d0693002906c30023075300260793003d081e0029084e002308de0026091e003d0b6b00290b9b00230c2b00260c6b003d0cf600290d2600230db600260df6003d'
const expected3 = '01bb002901eb0023027b002602bb003d0346002903760023040600260446003d000000000000000005860018000000000000000000000000078e001700000000'

describe('atomByteOffsetMetadata', async () => {
    before(async () => {
        await setupFinished
    })

    it('should find byte offsets of transfer action particles', () => {
        const atom = new RadixAtom()
        atom.particleGroups.push(createTransferAction(alice.address, bob.address, token, 1))

        const result = cborByteOffsets(atom)
        expect(result.toString('hex')).to.equal(expected1)
    })

    it('should find byte offsets of many transfer action particles', () => {
        const atom = new RadixAtom()
        atom.particleGroups.push(createTransferAction(alice.address, bob.address, token, 1))
        atom.particleGroups.push(createTransferAction(alice.address, clara.address, token, 2))
        atom.particleGroups.push(createTransferAction(alice.address, diana.address, token, 7))

        const result = cborByteOffsets(atom)
        expect(result.toString('hex')).to.equal(expected2)
    })

    it('should find byte offsets of transfer particles and data particles', () => {
        const atom = new RadixAtom()
        atom.particleGroups.push(createTransferAction(alice.address, bob.address, token, 1))
        atom.particleGroups.push(createMessageAction(alice.address, bob.address, 'HEY!'))
        atom.particleGroups.push(createUniqueAction(alice.address, 'Unicorn'))

        const result = cborByteOffsets(atom)
        expect(result.toString('hex')).to.equal(expected3)
    })

 
})
