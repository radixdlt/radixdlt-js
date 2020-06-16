import { cborByteOffsetsOfUpParticles } from '../src/atomByteOffsetMetadata'
import {
    RadixAddress,
    RadixSimpleIdentity,
    RRI,
    RadixAtom,
    radixUniverse,
    RadixUniverse,
} from 'radixdlt'
import { app } from '../src/LedgerApp'
import { createTransferAction, createMessageAction, createBurnAction } from './utils'
import 'mocha'
import { RadixUInt256 } from '../../atommodel'

let alice
let bob
let clara
let diana
let hal

describe('LedgerApp', async () => {
    before(async () => {
        await radixUniverse.bootstrapTrustedNode(RadixUniverse.LOCALHOST)
        
        alice = new RadixSimpleIdentity(RadixAddress.fromAddress('JEyoKNEYawJkNTiinQh1hR9c3F57ANixyBRi9fsSEfGedumiffR'))
        bob = new RadixSimpleIdentity(RadixAddress.fromAddress('JFeqmatdMyjxNce38w3pEfDeJ9CV6NCkygDt3kXtivHLsP3p846'))
        clara = new RadixSimpleIdentity(RadixAddress.fromAddress('JG3Ntbhj144hpz2ZooKsQG3Hq7UkCMwmFMwXfaYQgKFzNXAQvo5'))
        diana = new RadixSimpleIdentity(RadixAddress.fromAddress('JFtJPDGvw4NDQyqCk7P5pWudNMeT8TFGCSvY9pTEqiyVhUGM9R9'))
        hal = new RadixSimpleIdentity(RadixAddress.fromAddress('JEWaBeWxn9cju3i6SA5A41FWkBUn8hvRYHCtPh26rCRnumyVCfP'))

    })

    it.only('should', async function t() {
        this.timeout(120000)

        const atom = new RadixAtom()

        const token = {
            rri: new RRI(alice.address, 'ZELDA'),
            availableAmount: 1000,
        }

        atom.particleGroups.push(createTransferAction(alice.address, bob.address, token, 1))
        atom.particleGroups.push(createTransferAction(alice.address, clara.address, token, 2))
        atom.particleGroups.push(createTransferAction(alice.address, diana.address, token, 3))
        atom.particleGroups.push(createMessageAction(alice, hal, 'Open the pod bay doors'))
        atom.setTimestamp(1590415693007)

        const result = await app.signAtom(atom, alice.address)
    })

    it('no_data_single_transfer_small_amount_with_change', async function t() {
        this.timeout(120000)

        const atom = new RadixAtom()
        const token = new RRI(alice.address, 'ZELDA')

        atom.particleGroups.push(createTransferAction(alice.address, bob.address, {
            rri: token,
            availableAmount: 1000,
        }, 9))
        atom.setTimestamp(1590415693007)

        const result = await app.signAtom(atom, alice.address)
    })

    it('no_data_single_transfer_small_amount_no_change', async function t() {
        this.timeout(120000)

        const atom = new RadixAtom()
        const token = new RRI(alice.address, 'ZELDA')

        atom.particleGroups.push(createTransferAction(alice.address, bob.address, {
            rri: token,
            availableAmount: 9,
        }, 9))
        atom.setTimestamp(1590415693007)

        const result = await app.signAtom(atom, alice.address)
    })

    it('no_data_single_transfer_huge_amount_with_change', async function t() {
        this.timeout(120000)

        const atom = new RadixAtom()
        const token = new RRI(alice.address, 'ZELDA')

        atom.particleGroups.push(createTransferAction(alice.address, bob.address, {
            rri: token,
            availableAmount: 2 ^ 256 - 1,
        }, 2 ^ 256 - 1338))
        atom.setTimestamp(1590415693007)

        const result = await app.signAtom(atom, alice.address)
    })

    it('no_data_single_transfer_huge_amount_no_change', async function t() {
        this.timeout(120000)

        const atom = new RadixAtom()
        const token = new RRI(alice.address, 'ZELDA')

        atom.particleGroups.push(createTransferAction(alice.address, bob.address, {
            rri: token,
            availableAmount: 2 ^ 256 - 1338,
        }, 2 ^ 256 - 1338))
        atom.setTimestamp(1590415693007)

        const result = await app.signAtom(atom, alice.address)
    })

    it('data_no_transfer_burn_action', async function t() {
        this.timeout(120000)

        const atom = new RadixAtom()
        const token = new RRI(alice.address, 'ZELDA')

        atom.particleGroups.push(createBurnAction(alice.address, {
            rri: token,
            availableAmount: 1000,
        }, 10))
        atom.setTimestamp(1590415693007)

        const result = await app.signAtom(atom, alice.address)
    })

    it('data_no_transfer_message_action', async function t() {
        this.timeout(120000)

        const atom = new RadixAtom()

        atom.particleGroups.push(createMessageAction(alice, clara, 'hey!'))
        atom.setTimestamp(1590415693007)

        const result = await app.signAtom(atom, alice.address)
    })

    it('data_no_transfer_put_unique_action', async function t() {
        this.timeout(120000)

        const atom = new RadixAtom()

        atom.particleGroups.push(createMessageAction(alice, clara, 'hey!'))
        atom.setTimestamp(1590415693007)

        const result = await app.signAtom(atom, alice.address)
    })


})
