// https://github.com/radixdlt/radixdlt-ledger-app/blob/improve/change_cosmos_to_radix/docs/APDUSPEC.md

import { ReturnCode, Instruction, CLA } from './types'
import { sendApduMsg } from './HardwareWallet'
import { cborByteOffsets } from './atomByteOffsetMetadata'
import { Subject, Observable } from 'rxjs'
import { RadixAtom, RadixTransferrableTokensParticle, RadixSpin, RadixECSignature, RadixBytes } from 'radixdlt'

const CHUNK_SIZE = 255

let isSigning = false

let version: string
let versionResolve

const versionPromise = new Promise((resolve, reject) => {
    versionResolve = resolve
})

const observable = new Observable<AppState>(subscriber => {
    let connected = false
    setInterval(async () => {
        if (isSigning) { return }
        try {
            const result = await getVersion()
            if (!version) {
                version = result.version
                versionResolve()
            }
            if (connected) { return }
        } catch (e) {
            if (!connected) { return }
        }
        connected = !connected
        subscriber.next(connected ? AppState.APP_OPEN : AppState.APP_CLOSED)
    }, 500)
})

const subject = new Subject<AppState>()
observable.subscribe(subject)

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

const generateGetVersionResponse = parseResponse.bind(null, response =>
    ({
        CLA: response.slice(0, 1),
        locked: response.slice(4, 5),
        version: `
            ${parseInt(response.slice(1, 2).toString('hex'), 16)}.
            ${parseInt(response.slice(2, 3).toString('hex'), 16)}.
            ${parseInt(response.slice(3, 4).toString('hex'), 16)}
        `,
    }))

const getPublicKey = (bip44: string, p1: number = 0, p2: number = 0): Promise<{ publicKey: Buffer }> =>
    sendMessage(
        generateGetPublicKeyResponse,
        Instruction.INS_GET_PUBLIC_KEY,
        Buffer.from(bip44, 'hex'),
        p1,
        p2,
    )

const signHash = (bip44: string, hash: Buffer): Promise<{ signature: Buffer }> =>
    sendMessage(
        generateSignResponse,
        Instruction.INS_SIGN_HASH,
        Buffer.concat([Buffer.from(bip44, 'hex'), hash]),
        20,
        hash.length,
    )

const getVersion = () =>
    sendMessage(
        generateGetVersionResponse,
        Instruction.INS_GET_VERSION,
    )

const getVersionPublic = async () => {
    await versionPromise
    return version
}

const signAtomWithState = async (bip44: string, atom: RadixAtom): Promise<RadixAtom> => {
    isSigning = true
    const result = await signAtom(bip44, atom)
    isSigning = false
    return result
}

async function signAtom(bip44: string, atom: RadixAtom): Promise<RadixAtom> {
    const numberOfTransfers = atom.getSpunParticlesOfType(RadixTransferrableTokensParticle).filter(particle => {
        return particle.spin === RadixSpin.UP
    }).length
    if (numberOfTransfers > 6) { throw new Error('Maximum number of transfers exceeded.') }

    const sendSignAtomMessage = sendMessage.bind(null, generateSignResponse, Instruction.INS_SIGN_ATOM)

    const payload: Buffer = atom.toDSON()
    if (payload.length > 65536) { throw new Error('Exceeded atom size limit for signing.') }

    const chunks = chunksFromPayload(payload)

    const particleMetaData = cborByteOffsets(atom)
    const pathEncoded = Buffer.from(bip44, 'hex')

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
        try {
        response = await sendSignAtomMessage(
            chunk,
            numberOfUpParticles,
        )
        } catch (e) {
            if (e.returnCode === ReturnCode.SW_USER_REJECTED) {
                subject.next(AppState.SIGN_REJECT)
        }
            throw e
    }
    }

    subject.next(AppState.SIGN_CONFIRM)

    const r: Buffer = response.signature.slice(0, 32)
    const s: Buffer = response.signature.slice(32, 64)

    const rArray = [...r]
    const sArray = [...s]

    const signature = new RadixECSignature()
    signature.r = new RadixBytes(rArray)
    signature.s = new RadixBytes(sArray)

    atom.signatures = { [signatureId.toString()]: signature }

    return atom
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

const observable = new Observable<boolean>(subscriber => {
    let connected = false
    setInterval(async () => {
        if (isSigning) { return }
        try {
            // console.log('sending getVersion')
            await getVersion()
            if (connected) { return }
        } catch (e) {
            if (!connected) { return }
        }
        connected = !connected
        subscriber.next(connected)
    }, 500)
})

const subject = new Subject<boolean>()
observable.subscribe(subject)

export const subscribeAppConnection = subject.subscribe.bind(subject)

export const app = {
    getPublicKey,
    getVersion: getVersionPublic,
    signAtom: signAtomWithState,
    signHash,
}
