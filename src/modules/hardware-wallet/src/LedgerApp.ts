import { ReturnCode, Instruction, CLA, AppState, LedgerApp } from './types'
import { sendApduMsg } from './HardwareWallet'
import { cborByteOffsets } from './atomByteOffsetMetadata'
import { Subject, Observable } from 'rxjs'
import { RadixAddress, RadixSpin, RadixECSignature, RadixBytes } from 'radixdlt'

const CHUNK_SIZE = 255

let performingInstruction = false

let version: string
let versionResolve

const versionPromise = new Promise((resolve, reject) => {
    versionResolve = resolve
})

const appStateObservable = new Observable<AppState>(subscriber => {
    let connected = false
    setInterval(async () => {
        if (performingInstruction) { return }
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

const appStateSubject = new Subject<AppState>()
appStateObservable.subscribe(appStateSubject)

const atomHashObservable = new Subject<string>()

const sendInstruction = sendApduMsg.bind(null, CLA, handleError)

const getPublicKeyResponse = parseResponse.bind(null, response =>
    ({
        publicKey: response.slice(0, 33),
    }),
)

const signResponse = parseResponse.bind(null, response =>
    ({
        signature: response.slice(0, 64),
    }),
)

const getVersionResponse = parseResponse.bind(null, response =>
    ({
        CLA: response.slice(0, 1),
        locked: response.slice(4, 5),
        version: `
            ${parseInt(response.slice(1, 2).toString('hex'), 16)}.
            ${parseInt(response.slice(2, 3).toString('hex'), 16)}.
            ${parseInt(response.slice(3, 4).toString('hex'), 16)}
        `,
    }))

const getRadixAddressResponse = parseResponse.bind(null, response => {
    const addressLength = response.length - 2
    return {
        radixAddress: response.slice(0, addressLength),
    }
})

export const getPublicKey = (bip44: string, p1: 0 | 1 = 0): Promise<{ publicKey: Buffer }> =>
    sendInstruction(
        getPublicKeyResponse,
        Instruction.INS_GET_PUBLIC_KEY,
        Buffer.from(bip44, 'hex'),
        p1,
    )

export const signHash = (bip44: string, hash: Buffer): Promise<{ signature: Buffer }> =>
    sendInstruction(
        signResponse,
        Instruction.INS_SIGN_HASH,
        Buffer.concat([Buffer.from(bip44, 'hex'), hash]),
        20,
        hash.length,
    )

const getVersion = sendInstruction.bind(
    null,
    getVersionResponse,
    Instruction.INS_GET_VERSION,
)

export const getRadixAddressWithState = async (bip44: string, p2: number): Promise<{
    radixAddress: Buffer,
    done: () => void,
}> => {
    performingInstruction = true
    const result = await getRadixAddress(bip44, p2)

    appStateSubject.next(AppState.APP_OPEN)

    const done = () => {
        performingInstruction = false
    }

    return {
        radixAddress: result.radixAddress,
        done,
    }
}

export const getRadixAddress = (bip44: string, p2: number, p1: 0 | 1 | 2 | 3 = 1): Promise<{
    radixAddress: Buffer,
    done: () => void,
}> =>
    sendInstruction(
        getRadixAddressResponse,
        Instruction.INS_GEN_RADIX_ADDR,
        Buffer.from(bip44, 'hex'),
        p1,
        p2,
    )

export const getVersionPublic = async (): Promise<string> => {
    await versionPromise
    return version
}

export const signAtomWithState = async (bip44: string, atom: any): Promise<any> => {
    performingInstruction = true
    const signatureId = RadixAddress.fromPublic((await getPublicKey(bip44)).publicKey).getUID()
    const result = await signAtom(bip44, atom, signatureId)
    performingInstruction = false
    return result
}

export async function signAtom(bip44: string, atom: any, uid: any): Promise<any> {
    const numberOfTransfers = atom.getParticlesOfSpin(RadixSpin.UP).filter(particle => {
        return particle.constructor.name === 'RadixTransferrableTokensParticle'
    }).length

    if (numberOfTransfers > 6) { throw new Error('Maximum number of transfers exceeded.') }

    const sendSignAtomMessage = sendInstruction.bind(null, signResponse, Instruction.INS_SIGN_ATOM)

    const payload: Buffer = atom.toDSON()
    if (payload.length > 65536) { throw new Error('Exceeded atom size limit for signing.') }

    atomHashObservable.next(atom.getHash().toString('hex'))

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

    if (initialPayload.length > 255) {
        throw new Error('Initial payload size too large.')
    }

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
            performingInstruction = false
            if (e.returnCode === ReturnCode.SW_USER_REJECTED) {
                appStateSubject.next(AppState.SIGN_REJECT)
            }
            throw e
        }
    }

    appStateSubject.next(AppState.SIGN_CONFIRM)

    const r: Buffer = response.signature.slice(0, 32)
    const s: Buffer = response.signature.slice(32, 64)

    const rArray = [...r]
    const sArray = [...s]

    const signature = new RadixECSignature()
    signature.r = new RadixBytes(rArray)
    signature.s = new RadixBytes(sArray)

    atom.signatures = { [uid.toString()]: signature }

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

function handleError(returnCode: number): { returnCode: number, error: Error } {
    switch (returnCode) {
        case ReturnCode.SW_USER_REJECTED:
            return {
                returnCode,
                error: new Error('User canceled operation.'),
            }
        case ReturnCode.CLA_NOT_SUPPORTED:
            return {
                returnCode,
                error: new Error('App identifier (CLA) mismatch. Are you running the Radix app?'),
            }
        case ReturnCode.INS_NOT_SUPPORTED:
            return {
                returnCode,
                error: new Error('Instruction not supported by app.'),
            }
    }
    return {
        returnCode,
        error: new Error(`Unknown Ledger error: ${returnCode}`),
    }
}

function chunksFromPayload(payload: Buffer): Buffer[] {
    const chunks: Buffer[] = []

    for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
        const end = i + CHUNK_SIZE
        chunks.push(payload.slice(i, end))
    }

    return chunks
}

export const subscribeAppConnection = appStateSubject.subscribe.bind(appStateSubject)

export { atomHashObservable }

export const ledgerApp: LedgerApp = {
    getRadixAddress: getRadixAddressWithState,
    getPublicKey,
    getVersion: getVersionPublic,
    signAtom: signAtomWithState,
    signHash,
}
