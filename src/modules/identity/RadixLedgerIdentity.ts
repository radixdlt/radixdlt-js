/*
 * (C) Copyright 2020 Radix DLT Ltd
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the “Software”),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

import { RadixAccount, RadixIdentity } from '../..'
import { RadixAddress, RadixAtom } from '../atommodel'
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'
import {
    Instruction,
    Handler,
    SignPayloadType,
    ReturnCode,
} from './ledgerAppTypes'

const CLA = 0xaa

// HD Derivation Path: /0'/0/0
const BIP44_PATH = '80000000' + '00000000' + '00000000'

const CHUNK_SIZE = 250

export default class RadixLedgerIdentity extends RadixIdentity {
    private device
    private send: (handler, ins, data, p1?, p2?, cla?) => Promise<Buffer>
    public address: RadixAddress
    public account: RadixAccount

    private constructor(address: RadixAddress, device, account: RadixAccount) {
        super(address)
        this.device = device
        this.account = account
        this.send = (handler, ...args) => sendApduMsg(...args)(handler)(this.device)
    }

    public static async createNew(): Promise<RadixLedgerIdentity> {
        const device = await open()
        const response = await publicKeyFromLedger()(device)
        const address = RadixAddress.fromPublic(response.publicKey)
        const account = new RadixAccount(address)

        const identity = new RadixLedgerIdentity(address, device, account)
        account.enableDecryption(identity)

        return identity
    }

    public getDeviceInfo() {
        if (!this.device) { throw new Error('Connection not opened.') }

        return this.device.device.getDeviceInfo()
    }

    public async getVersion() {
        return await sendApduMsg(
            Instruction.INS_GET_VERSION,
            new Buffer(''),
        )(Handler.GET_VERSION)
    }

    public async signAtom(atom: RadixAtom): Promise<RadixAtom> {
        // TODO max size of dson byte array should be 2048 bytes
        const payload = atom.toDSON()
        const chunks = chunksFromPayload(BIP44_PATH, payload)

        await this.send(
            Handler.SIGN_ATOM,
            Instruction.INS_SIGN_ATOM,
            chunks[0],
            SignPayloadType.INIT,
        )

        let response
        let payloadType = SignPayloadType.ADD

        for (let i = 1; i < chunks.length; i += 1) {
            if (i === chunks.length - 1) { payloadType = SignPayloadType.LAST }

            response = await this.send(
                Handler.SIGN_ATOM,
                Instruction.INS_SIGN_ATOM,
                chunks[i],
                payloadType,
            )

            if (response.returnCode !== ReturnCode.SUCCESS) {
                throw handleTransportError(response.returnCode)
            }
        }

        const signatureId = this.address.getUID()

        atom.signatures = { [signatureId.toString()]: response.signature }

        return atom
    }

    public async decryptECIESPayload(payload: Buffer) {
        // TODO
        return new Buffer('')
    }

    public async decryptECIESPayloadWithProtectors(
        protectors: Buffer[],
        payload: Buffer,
    ) {
        // TODO
        return new Buffer('')
    }

    public getPublicKey() {
        return this.address.getPublic()
    }
}

async function open() {
    const ledgerDevicePath = (await TransportNodeHid.list())[0]
    if (!ledgerDevicePath) { throw new Error('No Ledger device found.') }
    return await TransportNodeHid.open(ledgerDevicePath)
}

function publicKeyFromLedger(): (device) => Promise<any> {
    return sendApduMsg(
        Instruction.INS_GET_PUBLIC_KEY,
        new Buffer(BIP44_PATH, 'hex')
    )(Handler.GET_PUBLIC_KEY)
}

/*
       Defines a method for sending an APDU message.
       Specification:
       https://www.blackhat.com/presentations/bh-usa-08/Buetler/BH_US_08_Buetler_SmartCard_APDU_Analysis_V1_0_2.pdf
   */
// TODO do we need statusList param? https://github.com/LedgerHQ/ledgerjs/blob/fc435a9611e9e3554d0d4be2939e6da44ba20735/packages/hw-transport/src/Transport.js#L194
function sendApduMsg(
    ins: Instruction,
    data: Buffer,
    p1: number = 0,
    p2: number = 0,
    cla: number = CLA,
): (handler: Handler) => (device) => Promise<any> {
    return (handler: Handler) => async device => {
        if (cla > 255 || ins > 255 || p1 > 255 || p2 > 255) {
            throw new Error(
                `Parameter validation for ADPU message failed. 
                 Too many bytes given in one or several params.`,
            )
        }

        try {
            const response: Buffer = await device.send(cla, ins, p1, p2, data)
            return parseResponse(response, handler)
        } catch (e) {
            throw handleTransportError(e.statusCode)
        }
    }
}

function chunksFromPayload(path: string, payload: Buffer): Buffer[] {
    const chunks: Buffer[] = []
    chunks.push(new Buffer(path, 'hex'))

    for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
        let end = i + CHUNK_SIZE
        if (i > payload.length) {
            end = payload.length
        }
        chunks.push(payload.slice(i, end))
    }

    return chunks
}

function parseResponse(response: Buffer, handler: Handler) {
    const returnCodeData = response.slice(-2)
    const returnCode = returnCodeData[0] * 256 + returnCodeData[1]

    let generatedResponse

    switch (handler) {
        case Handler.GET_VERSION:
            generatedResponse = generateGetVersionResponse(response)
            break
        case Handler.GET_PUBLIC_KEY:
            generatedResponse = generateGetPublicKeyResponse(response)
            break
        case Handler.SIGN_ATOM:
            generatedResponse = generateSignAtomResponse(response)
    }

    return {
        returnCode,
        ...generatedResponse,
    }
}


function generateGetVersionResponse(response: Buffer) {
    let targetId = 0
    if (response.length >= 9) {
        targetId =
            (response[5] << 24) +
            (response[6] << 16) +
            (response[7] << 8) +
            (response[8] << 0)
    }
    return {
        error_message: '-',
        test_mode: response[0] !== 0,
        major: response[1],
        minor: response[2],
        patch: response[3],
        device_locked: response[4] === 1,
        target_id: targetId.toString(16),
    }
}

function generateGetPublicKeyResponse(response: Buffer) {
    return {
        publicKey: response.slice(0, 33),
    }
}

function generateSignAtomResponse(response: Buffer) {
    return {
        signature: response.slice(0, 64),
    }
}

function handleTransportError(statusCode: ReturnCode): Error {
    switch (statusCode) {
        case ReturnCode.SW_USER_REJECTED:
            return new Error('User canceled operation.')
        case ReturnCode.CLA_NOT_SUPPORTED:
            return new Error(
                'App identifier (CLA) mismatch. Are you running the Radix app?',
            )
        case ReturnCode.INS_NOT_SUPPORTED:
            return new Error('Instruction not supported by app.')
    }
    return new Error(`Unknown Ledger error: ${statusCode}`)
}