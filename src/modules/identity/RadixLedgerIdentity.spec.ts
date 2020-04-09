import { expect } from 'chai'
import { describe, beforeEach, before, test } from 'mocha'
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'
import sinon from 'sinon'
import { RadixAtom, RadixAddress } from '../atommodel'
import { Handler, APDUBytes, HDPathParts } from './ledgerAppTypes'

let returnValueMock

const transportMock = {
    send: (cla, ins, p1, p2, data) => returnValueMock
}

sinon.stub(TransportNodeHid, 'open').resolves(transportMock)

const spySend = sinon.spy(transportMock, 'send')

function serializeApdu(
    cla: number,
    ins: number,
    p1: number,
    p2: number,
    data: Buffer
) {
    return Buffer.concat([
        Buffer.from([cla, ins, p1, p2]),
        Buffer.from([data.length]),
        data
    ])
}

beforeEach(() => {
    spySend.resetHistory()
})

import RadixLedgerIdentity from './RadixLedgerIdentity'

describe.only('RadixLedgerIdentity', async () => {
    test('publicKeyFromLedger', async () => {
        returnValueMock = RadixAddress.generateNew().getPublic()
        await RadixLedgerIdentity.createNew()

        const [cla, ins, p1, p2, data] = spySend.getCall(0).args
        const apdu = serializeApdu(cla, ins, p1, p2, data).toString('hex')

        expect(apdu).to.equal(
            `${APDUBytes.CLA}` +
                `${APDUBytes.INS_GET_PUBLIC_KEY}` +
                `${APDUBytes.P1_0}` +
                `${APDUBytes.P2_0}` +
                `${APDUBytes.L_HD_PATH}` +
                `${APDUBytes.HD_PATH}`
        )
    })

    test('signAtom', async () => {
        returnValueMock = RadixAddress.generateNew().getPublic()

        const identity = await RadixLedgerIdentity.createNew()
  
        returnValueMock = new Buffer(66)
        returnValueMock[64] = 0x90
        returnValueMock[65] = 0x00
        const atom = new RadixAtom()

        await identity.signAtom(atom)

        let apdu

        // First call should send HD path as data
        const [cla, ins, p1, p2, data] = spySend.getCall(1).args
        apdu = serializeApdu(cla, ins, p1, p2, data).toString('hex')
        expect(apdu).to.equal(
            `${APDUBytes.CLA}` +
                `${APDUBytes.INS_SIGN_ATOM}` +
                `${APDUBytes.P1_0}` +
                `${APDUBytes.P2_0}` +
                `${APDUBytes.L_HD_PATH}` +
                `${APDUBytes.HD_PATH}`
        )

        // Second call should send atom data
        const [cla2, ins2, p1_2, p2_2, data2] = spySend.getCall(2).args
        apdu = serializeApdu(cla2, ins2, p1_2, p2_2, data2).toString('hex')

        const dson = atom.toDSON().toString('hex')

        expect(apdu).to.equal(
            `${APDUBytes.CLA}` +
                `${APDUBytes.INS_SIGN_ATOM}` +
                `${APDUBytes.P1_2}` +
                `${APDUBytes.P2_0}` +
                `0${data2.length.toString(16)}` +
                `${dson}`
        )
    })
})
