import {
    RRI,
    RadixAtom,
    RadixSpin,
    RadixTransferrableTokensParticle,
    RadixAddress,
    RadixSimpleIdentity,
} from 'radixdlt'
import { ledgerApp } from '../src/LedgerApp'
import { createTransferAction, createMessageAction, createBurnAction, createUniqueAction } from '../test/utils'
import { alice, bob, diana, clara, hal, setupFinished } from '../test/setup'
import 'mocha'
import * as bip32 from 'bip32'
import * as bip39 from 'bip39'
import { expect } from 'chai'

const BIP44_PATH = '80000002' + '00000001' + '00000003'
const MNEMONIC = 'equip will roof matter pink blind book anxiety banner elbow sun young'

/*
    !!

    These tests are intended to run together with a Ledger Nano S hardware device connected, with the
    Radix app open.
    
    They will pass in any case, but you need to verify that the display of the ledger corresponds to the
    logged output from the tests.

    Assumes stored mnemonic in the ledger: equip will roof matter pink blind book anxiety banner elbow sun young

    !!
*/

let node
let signer: RadixSimpleIdentity

describe('Hardware wallet tests', async function() {
    this.timeout(120000)

    before(async () => {
        await setupFinished

        const masterNode = bip32.fromSeed(bip39.mnemonicToSeedSync(MNEMONIC))
        node = masterNode.derivePath(`m/44'/536'/2'/1/3`)
        signer = RadixSimpleIdentity.fromPrivate(node.privateKey)
    })

    afterEach(async () => {
        await new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve()
            }, 500)
        })
    })

    describe('should successfully sign', () => {
        it('several transfers and a message', async () => {

            const atom = new RadixAtom()

            const token = {
                rri: new RRI(signer.address, 'ZELDA'),
                availableAmount: 1000,
            }

            atom.particleGroups.push(createTransferAction(signer.address, bob.address, token, 1))
            atom.particleGroups.push(createTransferAction(signer.address, clara.address, token, 2))
            atom.particleGroups.push(createTransferAction(signer.address, diana.address, token, 3))
            atom.particleGroups.push(createMessageAction(signer.address, hal.address, 'Open the pod bay doors'))

            generateExpectedLogs(atom, signer.address)

            const result = await ledgerApp.signAtom(BIP44_PATH, atom)
            const expectedSignature = (await signer.signAtom(atom)).signatures

            expect(result.signatures).to.equal(expectedSignature)
        })

        it('no data single transfer small amount with change', async () => {
            const atom = new RadixAtom()
            const token = new RRI(alice.address, 'ZELDA')

            atom.particleGroups.push(createTransferAction(alice.address, bob.address, {
                rri: token,
                availableAmount: 1000,
            }, 9))

            generateExpectedLogs(atom, alice.address)

            const result = await ledgerApp.signAtom(BIP44_PATH, atom)
            const expectedSignature = (await signer.signAtom(atom)).signatures

            expect(result.signatures).to.equal(expectedSignature)
        })

        it('no_data_single_transfer_small_amount_no_change', async () => {
            const atom = new RadixAtom()
            const token = new RRI(alice.address, 'ZELDA')

            atom.particleGroups.push(createTransferAction(alice.address, bob.address, {
                rri: token,
                availableAmount: 9,
            }, 9))

            generateExpectedLogs(atom, alice.address)

            const result = await ledgerApp.signAtom(BIP44_PATH, atom)
            const expectedSignature = (await signer.signAtom(atom)).signatures

            expect(result.signatures).to.equal(expectedSignature)
        })

        it('no_data_single_transfer_huge_amount_with_change', async () => {
            const atom = new RadixAtom()
            const token = new RRI(alice.address, 'ZELDA')

            const largeNbr = Math.pow(2, 40)

            atom.particleGroups.push(createTransferAction(alice.address, bob.address, {
                rri: token,
                availableAmount: largeNbr,
            }, largeNbr - 1337))

            generateExpectedLogs(atom, alice.address)

            const result = await ledgerApp.signAtom(BIP44_PATH, atom)
            const expectedSignature = (await signer.signAtom(atom)).signatures

            expect(result.signatures).to.equal(expectedSignature)
        })

        it('no_data_single_transfer_huge_amount_no_change', async () => {
            const atom = new RadixAtom()
            const token = new RRI(alice.address, 'ZELDA')

            const largeNbr = Math.pow(2, 40)

            atom.particleGroups.push(createTransferAction(alice.address, bob.address, {
                rri: token,
                availableAmount: largeNbr,
            }, largeNbr))

            generateExpectedLogs(atom, alice.address)

            const result = await ledgerApp.signAtom(BIP44_PATH, atom)
            const expectedSignature = (await signer.signAtom(atom)).signatures

            expect(result.signatures).to.equal(expectedSignature)
        })

        it('data_no_transfer_burn_action', async () => {
            const atom = new RadixAtom()
            const token = new RRI(signer.address, 'ZELDA')

            atom.particleGroups.push(createBurnAction(alice.address, {
                rri: token,
                availableAmount: 1000,
            }, 10))

            generateExpectedLogs(atom, alice.address)

            const result = await ledgerApp.signAtom(BIP44_PATH, atom)

            const expectedSignature = (await signer.signAtom(atom)).signatures

            expect(result.signatures).to.equal(expectedSignature)
        })

        it('data_no_transfer_message_action', async () => {
            const atom = new RadixAtom()

            atom.particleGroups.push(createMessageAction(alice.address, clara.address, 'hey!'))

            generateExpectedLogs(atom, alice.address)

            const result = await ledgerApp.signAtom(BIP44_PATH, atom)
            const expectedSignature = (await signer.signAtom(atom)).signatures

            expect(result.signatures).to.equal(expectedSignature)
        })

        it('data_no_transfer_put_unique_action', async () => {
            const atom = new RadixAtom()

            atom.particleGroups.push(createUniqueAction(alice.address, 'hey!'))

            generateExpectedLogs(atom, alice.address)

            const result = await ledgerApp.signAtom(BIP44_PATH, atom)
            const expectedSignature = (await signer.signAtom(atom)).signatures

            expect(result.signatures).to.equal(expectedSignature)
        })

        it('data_single_transfer_small_amount_with_change', async () => {
            const atom = new RadixAtom()
            const token = new RRI(alice.address, 'ZELDA')

            atom.particleGroups.push(createTransferAction(alice.address, bob.address, {
                rri: token,
                availableAmount: 1000,
            }, 9))
            atom.particleGroups.push(createUniqueAction(alice.address, 'Yoo'))

            generateExpectedLogs(atom, alice.address)

            const result = await ledgerApp.signAtom(BIP44_PATH, atom)
            const expectedSignature = (await signer.signAtom(atom)).signatures

            expect(result.signatures).to.equal(expectedSignature)
        })

        it('data_single_transfer_small_amount_no_change', async () => {
            const atom = new RadixAtom()
            const token = new RRI(alice.address, 'ZELDA')

            atom.particleGroups.push(createTransferAction(alice.address, bob.address, {
                rri: token,
                availableAmount: 1000,
            }, 1000))
            atom.particleGroups.push(createUniqueAction(alice.address, 'Yoo'))

            generateExpectedLogs(atom, alice.address)

            const result = await ledgerApp.signAtom(BIP44_PATH, atom)
            const expectedSignature = (await signer.signAtom(atom)).signatures

            expect(result.signatures).to.equal(expectedSignature)
        })


        it('data_single_transfer_huge_amount_with_change', async () => {
            const atom = new RadixAtom()
            const token = new RRI(alice.address, 'ZELDA')

            const largeNbr = Math.pow(2, 40)

            atom.particleGroups.push(createTransferAction(alice.address, bob.address, {
                rri: token,
                availableAmount: largeNbr,
            }, largeNbr - 1337))
            atom.particleGroups.push(createUniqueAction(alice.address, 'Yoo'))

            generateExpectedLogs(atom, alice.address)

            const result = await ledgerApp.signAtom(BIP44_PATH, atom)
            const expectedSignature = (await signer.signAtom(atom)).signatures

            expect(result.signatures).to.equal(expectedSignature)
        })

        it('data_single_transfer_huge_amount_no_change', async () => {
            const atom = new RadixAtom()
            const token = new RRI(alice.address, 'ZELDA')

            const largeNbr = Math.pow(2, 40)

            atom.particleGroups.push(createTransferAction(alice.address, bob.address, {
                rri: token,
                availableAmount: largeNbr,
            }, largeNbr))
            atom.particleGroups.push(createUniqueAction(alice.address, 'Yoo'))

            generateExpectedLogs(atom, alice.address)

            const result = await ledgerApp.signAtom(BIP44_PATH, atom)
            const expectedSignature = (await signer.signAtom(atom)).signatures

            expect(result.signatures).to.equal(expectedSignature)
        })

        it('data_single_transfer_no_change_small_amount_unique_and_message', async () => {
            const atom = new RadixAtom()
            const token = new RRI(alice.address, 'ZELDA')

            atom.particleGroups.push(createUniqueAction(alice.address, 'Unicorn'))
            atom.particleGroups.push(createTransferAction(alice.address, bob.address, {
                rri: token,
                availableAmount: 1000,
            }, 1000))
            atom.particleGroups.push(createMessageAction(alice.address, diana.address, 'hey!'))

            generateExpectedLogs(atom, alice.address)

            const result = await ledgerApp.signAtom(BIP44_PATH, atom)
            const expectedSignature = (await signer.signAtom(atom)).signatures

            expect(result.signatures).to.equal(expectedSignature)
        })


        it('data_multiple_transfers_small_amounts_with_change_unique', async () => {
            const atom = new RadixAtom()
            const token = new RRI(alice.address, 'ZELDA')

            atom.particleGroups.push(createTransferAction(alice.address, bob.address, {
                rri: token,
                availableAmount: 1000,
            }, 9))
            atom.particleGroups.push(createTransferAction(alice.address, clara.address, {
                rri: token,
                availableAmount: 991,
            }, 42))
            atom.particleGroups.push(createTransferAction(alice.address, diana.address, {
                rri: token,
                availableAmount: 949,
            }, 237))
            atom.particleGroups.push(createUniqueAction(alice.address, 'Unicorn'))

            generateExpectedLogs(atom, alice.address)

            const result = await ledgerApp.signAtom(BIP44_PATH, atom)
            const expectedSignature = (await signer.signAtom(atom)).signatures

            expect(result.signatures).to.equal(expectedSignature)
        })


        it('data_multiple_transfers_small_and_big_amount_messages', async () => {

            const atom = new RadixAtom()
            const token = new RRI(alice.address, 'ZELDA')

            const largeNbr = Math.pow(2, 40)

            atom.particleGroups.push(createMessageAction(alice.address, clara.address, 'hey!'))
            atom.particleGroups.push(createTransferAction(alice.address, bob.address, {
                rri: token,
                availableAmount: largeNbr,
            }, 123))
            atom.particleGroups.push(createMessageAction(alice.address, clara.address, 'hey what!'))
            atom.particleGroups.push(createTransferAction(alice.address, bob.address, {
                rri: token,
                availableAmount: largeNbr - 123,
            }, largeNbr - 123))
            atom.particleGroups.push(createMessageAction(alice.address, clara.address, 'macarena!'))

            generateExpectedLogs(atom, alice.address)

            const result = await ledgerApp.signAtom(BIP44_PATH, atom)
            const expectedSignature = (await signer.signAtom(atom)).signatures

            expect(result.signatures).to.equal(expectedSignature)
        })
    })
})

function generateExpectedLogs(atom: RadixAtom, owner: RadixAddress) {
    const upParticles = atom.getParticlesOfSpin(RadixSpin.UP)

    let containsNonTransfer = false
    const transferParticles: RadixTransferrableTokensParticle[] = []

    for (const particle of upParticles) {
        if (particle instanceof RadixTransferrableTokensParticle) {
            if (particle.getAddress() === owner) { continue }
            transferParticles.push(particle)
        } else {
            containsNonTransfer = true
        }
    }

    console.log('')
    console.log('### Should display: ')
    console.log('')
    if (containsNonTransfer) { console.log('+ Non-Transfer data found!!') }
    if (transferParticles.length > 1) { console.log(` + Found ${transferParticles.length} transfers`) }

    for (let i = 1; i <= transferParticles.length; i++) {
        const tx = transferParticles[i - 1]
        console.log('')
        if (transferParticles.length > 1) { console.log(` + Review ${i} transfer`) }
        console.log(` + To address: ${tx.getAddress().toString()}`)
        console.log(` + Amount: ${tx.amount.toString()}`)
        console.log(` + Token: ${tx.getTokenDefinitionReference().getName()}, Full Identifier: ${tx.getTokenDefinitionReference().toString()}`)
    }
    console.log('')
    console.log(` + Verify Hash ${atom.getHash().toString('hex')}`)
}
