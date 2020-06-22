// https://github.com/radixdlt/radixdlt-ledger-app/blob/improve/change_cosmos_to_radix/docs/APDUSPEC.md

import { RadixAddress, RadixAtom, RadixECSignature, RadixSpin, RadixBytes, RadixTransferrableTokensParticle } from 'radixdlt'
import { ReturnCode, Instruction, CLA } from './types'
import { sendApduMsg } from './HardwareWallet'
import { cborByteOffsetsOfUpParticles } from './atomByteOffsetMetadata'

const CHUNK_SIZE = 255

// HD Derivation Path: /2'/1/3
const BIP44_PATH = '80000002' + '00000001' + '00000003'

const sendMessage = sendApduMsg.bind(null, CLA, handleError)

const generateGetPublicKeyResponse = parseResponse.bind(null, response =>
    ({
        publicKey: response.slice(0, 33),
    }),
)

const generateSignResponse = parseResponse.bind(null, response =>
    ({
        signature: response.slice(0, 64),
    }),
)

const getPublicKey = (p1: number = 0, p2: number = 0) =>
    sendMessage(
        generateGetPublicKeyResponse,
        Instruction.INS_GET_PUBLIC_KEY,
        Buffer.from(BIP44_PATH, 'hex'),
        p1,
        p2,
    )

const signHash = (hash: Buffer) =>
    sendMessage(
        generateSignResponse,
        Instruction.INS_SIGN_HASH,
        Buffer.concat([Buffer.from(BIP44_PATH, 'hex'), hash]),
        20,
        hash.length,
    )

async function signAtom(atom: RadixAtom, address: RadixAddress): Promise<RadixAtom> {
    const numberOfTransfers = atom.getSpunParticlesOfType(RadixTransferrableTokensParticle).filter(particle => {
        return particle.spin === RadixSpin.UP
    }).length
    if (numberOfTransfers > 6) { throw new Error('Maximum number of transfers exceeded.') }

    const sendSignAtomMessage = sendMessage.bind(null, generateSignResponse, Instruction.INS_SIGN_ATOM)

    const payload = atom.toDSON()
    const chunks = chunksFromPayload(payload)

    const particleMetaData = cborByteOffsetsOfUpParticles(atom)
    const pathEncoded = Buffer.from(BIP44_PATH, 'hex')

    const byteCountEncoded = Buffer.alloc(2)
    byteCountEncoded.writeUInt16BE(parseInt(payload.length.toString(16), 16), 0)


    const initialPayload = Buffer.concat([
        pathEncoded,
        byteCountEncoded,
        particleMetaData,
    ])

    const numberOfUpParticles = atom.getParticlesOfSpin(RadixSpin.UP).length

    await sendSignAtomMessage(
        initialPayload,
        numberOfUpParticles,
    )

    let response

    for (const chunk of chunks) {
        response = await sendSignAtomMessage(
            chunk,
            numberOfUpParticles,
        )

        if (response.returnCode !== ReturnCode.SUCCESS) {
            throw handleError(response.returnCode)
        }
    }

    const signatureId = address.getUID()

    const r = response.signature.slice(0, 32)
    const s = response.signature.slice(32, 65)

    const signature = new RadixECSignature()
    signature.r = new RadixBytes(r.toString('hex'))
    signature.s = new RadixBytes(s.toString('hex'))

    atom.signatures = { [signatureId.toString()]: signature }

    return atom
}

async function getDeviceInfo() {
    // const device = await openConnection()
    // return device.device.getDeviceInfo()
}

function parseResponse(generator: (response: Buffer) => any, response: Buffer): any {
    const returnCodeData = response.slice(-2)
    const returnCode = returnCodeData[0] * 256 + returnCodeData[1]

    return {
        returnCode,
        ...generator(response),
    }
}

function handleError(returnCode: number): Error {
    switch (returnCode) {
        case ReturnCode.SW_USER_REJECTED:
            return new Error('User canceled operation.')
        case ReturnCode.CLA_NOT_SUPPORTED:
            return new Error('App identifier (CLA) mismatch. Are you running the Radix app?')
        case ReturnCode.INS_NOT_SUPPORTED:
            return new Error('Instruction not supported by app.')
    }
    return new Error(`Unknown Ledger error: ${returnCode}`)
}

function chunksFromPayload(payload: Buffer): Buffer[] {
    const chunks: Buffer[] = []

    for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
        const end = i + CHUNK_SIZE
        chunks.push(payload.slice(i, end))
    }

    return chunks
}

export const app = {
    getPublicKey,
    signAtom,
    signHash,
    getDeviceInfo,
}
