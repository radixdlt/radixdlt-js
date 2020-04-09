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

export default class RadixLedgerIdentity implements RadixIdentity {
    private device
    public address: RadixAddress
    public account: RadixAccount

    public async init() {
        await this.open()
        const response = await this.publicKeyFromLedger()
        this.address = RadixAddress.fromPublic(response.publicKey)
        this.account = new RadixAccount(this.address)
        this.account.enableDecryption(this)
    }

    private async open() {
        const ledgerDevicePath = (await TransportNodeHid.list())[0]
        if (!ledgerDevicePath) { throw new Error('No Ledger device found.') }
        this.device = await TransportNodeHid.open(ledgerDevicePath)
    }

    public getDeviceInfo() {
        if (!this.device) { throw new Error('Connection not opened.') }

        return this.device.device.getDeviceInfo()
    }

    public async getVersion() {
        const response = await this.sendApduMsg(
            Instruction.INS_GET_VERSION,
            new Buffer(''),
        )
        return this.parseResponse(response, Handler.GET_VERSION)
    }

    public async signAtom(atom: RadixAtom): Promise<RadixAtom> {
        // TODO max size of dson byte array should be 2048 bytes
        const payload = atom.toDSON()
        const chunks = this.chunksFromPayload(BIP44_PATH, payload)

        await this.sendApduMsg(
            Instruction.INS_SIGN_ATOM,
            chunks[0],
            SignPayloadType.INIT,
        )

        let response
        let parsedResponse
        let payloadType = SignPayloadType.ADD

        for (let i = 1; i < chunks.length; i += 1) {
            if (i === chunks.length - 1) { payloadType = SignPayloadType.LAST }

            response = await this.sendApduMsg(
                Instruction.INS_SIGN_ATOM,
                chunks[i],
                payloadType,
            )
            parsedResponse = this.parseResponse(response, Handler.SIGN_ATOM)

            if (parsedResponse.returnCode !== ReturnCode.SUCCESS) {
                throw this.handleTransportError(parsedResponse.returnCode)
            }
        }

        const signatureId = this.address.getUID()

        atom.signatures = { [signatureId.toString()]: parsedResponse.signature }

        return atom
    }

    private chunksFromPayload(path: string, payload: Buffer): Buffer[] {
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

    public async publicKeyFromLedger(): Promise<{
        returnCode: number
        publicKey: Buffer,
    }> {
        const response = await this.sendApduMsg(
            Instruction.INS_GET_PUBLIC_KEY,
            new Buffer(BIP44_PATH, 'hex'),
        )

        return this.parseResponse(response, Handler.GET_PUBLIC_KEY)
    }

    /*
        Sends a APDU message.
        Specification:
        https://www.blackhat.com/presentations/bh-usa-08/Buetler/BH_US_08_Buetler_SmartCard_APDU_Analysis_V1_0_2.pdf
    */
    // TODO do we need statusList param? https://github.com/LedgerHQ/ledgerjs/blob/fc435a9611e9e3554d0d4be2939e6da44ba20735/packages/hw-transport/src/Transport.js#L194
    private async sendApduMsg(
        ins: Instruction,
        data: Buffer,
        p1: number = 0,
        p2: number = 0,
        cla: number = CLA,
    ): Promise<Buffer> {
        if (cla > 255 || ins > 255 || p1 > 255 || p2 > 255) {
            throw new Error(
                `Parameter validation for ADPU message failed. 
                 Too many bytes given in one or several params.`,
            )
        }

        try {
            return await this.device.send(cla, ins, p1, p2, data)
        } catch (e) {
            throw this.handleTransportError(e.statusCode)
        }
    }

    private handleTransportError(statusCode: ReturnCode): Error {
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

    private parseResponse(response: Buffer, handler: Handler) {
        const returnCodeData = response.slice(-2)
        const returnCode = returnCodeData[0] * 256 + returnCodeData[1]

        let generatedResponse

        switch (handler) {
            case Handler.GET_VERSION:
                generatedResponse = this.generateGetVersionResponse(response)
                break
            case Handler.GET_PUBLIC_KEY:
                generatedResponse = this.generateGetPublicKeyResponse(response)
                break
            case Handler.SIGN_ATOM:
                generatedResponse = this.generateSignAtomResponse(response)
        }

        return {
            returnCode,
            ...generatedResponse,
        }
    }

    private generateGetVersionResponse(response: Buffer) {
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

    private generateGetPublicKeyResponse(response: Buffer) {
        return {
            publicKey: response.slice(0, 33),
        }
    }

    private generateSignAtomResponse(response: Buffer) {
        return {
            signature: response.slice(0, 64),
        }
    }
}
