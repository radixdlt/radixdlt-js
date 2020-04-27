// https://github.com/radixdlt/radixdlt-ledger-app/blob/improve/change_cosmos_to_radix/docs/APDUSPEC.md

import { RadixAddress, RadixAtom } from '../atommodel'
import { ReturnCode, Instruction, CLA, SignPayloadType } from './types'
import { sendApduMsg } from './HWWallet'

const CHUNK_SIZE = 250

// HD Derivation Path: /0'/0/0
const BIP44_PATH = '80000002' + '00000001' + '00000003'

const sendMessage = sendApduMsg.bind(null, CLA, handleError)

const generateGetPublicKeyResponse = parseResponse.bind(null, response =>
    ({
        publicKey: response.slice(0, 33),
    })
)

const generateSignResponse = parseResponse.bind(null, response =>
    ({
        signature: response.slice(0, 64),
    })
)

export const getPublicKey = (p1: number = 0, p2: number = 0) =>
    sendMessage(generateGetPublicKeyResponse)(
        Instruction.INS_GET_PUBLIC_KEY,
        Buffer.from(BIP44_PATH, 'hex'),
        p1,
        p2
    )

export const signHash = (hash: Buffer) =>
    sendMessage(generateSignResponse)(
        Instruction.INS_SIGN_HASH,
        Buffer.concat([Buffer.from(BIP44_PATH, 'hex'), hash]),
        20,
        hash.length
    )

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
    //const device = await openConnection()
    //return device.device.getDeviceInfo()
}

async function parseResponse(generator: (response: Buffer) => any, response: Buffer): Promise<any> {
    const returnCodeData = response.slice(-2)
    const returnCode = returnCodeData[0] * 256 + returnCodeData[1]

    return {
        returnCode,
        ...generator(response)
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