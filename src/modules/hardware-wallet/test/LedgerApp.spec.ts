import 'mocha'
import { expect } from 'chai'
import { RadixAtom, RRI, RadixEUID } from 'radixdlt'
import { createUniqueAction, createTransferAction, createMessageAction } from './utils'
import { alice, bob, diana, setupFinished } from './setup'
import * as HW from '../src/HardwareWallet'
import sinon from 'sinon'
import { ReturnCode, CLA, Instruction } from '../src/types'

const sendMessageStub = sinon.stub(HW, 'sendApduMsg')
const signatureMock = Buffer.alloc(66, 1)

import { signAtom } from '../src/LedgerApp'

const BIP44_PATH = '80000002' + '00000001' + '00000003'

describe('LedgerApp', async () => {

    before(async () => {
        await setupFinished
    })

    describe('signAtom', () => {
        it('should successfully sign an atom', async () => {
            sendMessageStub.resolves({
                returnCode: ReturnCode.SUCCESS,
                signature: signatureMock,
            })

            const atom = new RadixAtom()
            const token = new RRI(alice.address, 'ZELDA')
            const byteCountEncoded = Buffer.alloc(2)

            atom.particleGroups.push(createUniqueAction(alice.address, 'Unicorn'))
            atom.particleGroups.push(createTransferAction(alice.address, bob.address, {
                rri: token,
                availableAmount: 1000,
            }, 1000))
            atom.particleGroups.push(createMessageAction(alice.address, diana.address, 'hey!'))

            byteCountEncoded.writeUInt16BE(parseInt(atom.toDSON().length.toString(16), 16), 0)

            const uid = new RadixEUID('test')
            const result = await signAtom(BIP44_PATH, atom, uid)

            expect(sendMessageStub.calledWith(
                CLA,
                sinon.match.any,
                sinon.match.any,
                Instruction.INS_SIGN_ATOM,
                Buffer.concat([
                    Buffer.from(BIP44_PATH, 'hex'),
                    byteCountEncoded,
                    Buffer.from('0000000000000000019200170000000003b9002903e900230479002604b9003d000000000000000005f9001800000000', 'hex'),
                ]),
                3,
            )).to.equal(true)

            expect(result.signatures[uid.toString()].r.bytes.toString('hex')).to.equal(
                '0101010101010101010101010101010101010101010101010101010101010101',
            )
        })

        it('should fail to sign an atom that has more than 6 transfers', async () => {
            const atom = new RadixAtom()
            const token = new RRI(alice.address, 'ZELDA')

            sendMessageStub.resolves({
                returnCode: ReturnCode.SUCCESS,
                signature: signatureMock,
            })

            for (let i = 0; i < 7; i++) {
                atom.particleGroups.push(createTransferAction(alice.address, bob.address, {
                    rri: token,
                    availableAmount: 1000,
                }, 1000))
            }

            let err
            try {
                await signAtom(BIP44_PATH, atom, new RadixEUID('test'))
            } catch (e) {
                err = e
                expect('pass')
            }
            if (!err) { expect.fail() }
        })

        it('should fail to sign an atom that is larger than 65536 bytes', async () => {
            const atom = new RadixAtom()

            sendMessageStub.resolves({
                returnCode: ReturnCode.SUCCESS,
                signature: signatureMock,
            })

            for (let i = 0; i < 202; i++) {
                atom.particleGroups.push(createMessageAction(alice.address, bob.address, 'Heyy'))
            }

            let err
            try {
                await signAtom(BIP44_PATH, atom, new RadixEUID('test'))
            } catch (e) {
                err = e
                expect('pass')
            }
            if (!err) { expect.fail() }
        })
    })
})
