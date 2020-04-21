// https://github.com/radixdlt/radixdlt-ledger-app/blob/improve/change_cosmos_to_radix/docs/APDUSPEC.md

import { RadixAddress, RadixAtom } from '../atommodel'
import { ReturnCode, Instruction, CLA, SignPayloadType } from './types'
import { sendApduMsg, openConnection } from './HWWallet'

const CHUNK_SIZE = 250

// HD Derivation Path: /0'/0/0
const BIP44_PATH = '80000002' + '00000001' + '00000003'

export async function getPublicKey(): Promise<any> {
    return await sendMessage(
        Instruction.INS_GET_PUBLIC_KEY,
        Buffer.from(BIP44_PATH, 'hex'),
        1
    )
}

export async function getVersion() {
    return await sendMessage(
        Instruction.INS_GET_VERSION,
        Buffer.from(''),
    )
}

export async function signAtom(atom: RadixAtom, address: RadixAddress): Promise<RadixAtom> {
    // TODO max size of dson byte array should be 2048 bytes

    const payload = atom.toDSON()
    const chunks = chunksFromPayload(BIP44_PATH, payload)

    // temporarily removed
    /*
    sendMessage(
        Instruction.INS_SIGN_ATOM,
        chunks[0],
        SignPayloadType.INIT
    )*/

    let response
    let payloadType = SignPayloadType.ADD

    for (let i = 1; i < chunks.length; i += 1) {
        if (i === chunks.length - 1) payloadType = SignPayloadType.LAST

        /*////// replacing temporarily
        response = await sendMessage(
            Instruction.INS_SIGN_ATOM,
            chunks[i],
            payloadType,
        )*/

        response = {
            returnCode: ReturnCode.SUCCESS,
            signature: address.sign(atom.getHash())
        }
        ///////////////////////

        if (response.returnCode !== ReturnCode.SUCCESS) {
            throw handleError(response.returnCode)
        }
    }

    const signatureId = address.getUID()

    /* temporarily removed
    const signature = RadixECSignature.fromEllasticSignature({
        r: response.signature.slice(0, 32),
        s: response.signature.slice(32, 65)
    })
    */

    // remember to replace with signature when not mocking
    atom.signatures = { [signatureId.toString()]: response.signature }

    return atom
}

export async function getDeviceInfo() {
    const device = await openConnection()
    return device.device.getDeviceInfo()
}

async function sendMessage(
    ins: Instruction,
    data: Buffer,
    p1: number = 0,
    p2: number = 0,
): Promise<any> {
    const device = await openConnection()
    return parseResponse(
        sendApduMsg.bind(null, ins, data, p1, p2, CLA, handleError, device),
        ins
    )
}

async function parseResponse(fn: () => Promise<Buffer>, instruction: Instruction): Promise<any> {
    const response = await fn()

    const returnCodeData = response.slice(-2)
    const returnCode = returnCodeData[0] * 256 + returnCodeData[1]

    let generatedResponse

    switch (instruction) {
        case Instruction.INS_GET_VERSION:
            generatedResponse = generateGetVersionResponse(response)
            break
        case Instruction.INS_GET_PUBLIC_KEY:
            generatedResponse = generateGetPublicKeyResponse(response)
            break
        case Instruction.INS_SIGN_ATOM:
            generatedResponse = generateSignAtomResponse(response)
            break
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

function handleError(returnCode: number): { error: Error, returnCode: number } {
    switch (returnCode) {
        case ReturnCode.SW_USER_REJECTED:
            return {
                error: new Error('User canceled operation.'),
                returnCode
            }
        case ReturnCode.CLA_NOT_SUPPORTED:
            return {
                error: new Error('App identifier (CLA) mismatch. Are you running the Radix app?'),
                returnCode
            }
        case ReturnCode.INS_NOT_SUPPORTED:
            return {
                error: new Error('Instruction not supported by app.'),
                returnCode
            }
    }
    return {
        error: new Error(`Unknown Ledger error: ${returnCode}`),
        returnCode
    }
}

function chunksFromPayload(path: string, payload: Buffer): Buffer[] {
    const chunks: Buffer[] = []
    chunks.push(Buffer.from(path, 'hex'))

    for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
        let end = i + CHUNK_SIZE
        if (i > payload.length) {
            end = payload.length
        }
        chunks.push(payload.slice(i, end))
    }

    return chunks
}