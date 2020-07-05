import { RadixAtom } from 'radixdlt'

export enum ReturnCode {
    SUCCESS = 0x9000,
    UNKNOWN = 0x6f00,
    CLA_NOT_SUPPORTED = 0x6e00,
    INS_NOT_SUPPORTED = 0x6d00,
    COMMAND_NOT_ALLOWED = 0x6986,
    OUTPUT_BUFFER_TOO_SMALL = 0x6983,
    EMPTY_BUFFER = 0x6982,
    EXECUTION_ERROR = 0x6400,
    WRONG_LENGTH = 0x6700,
    SW_USER_REJECTED = 0x6985,
}

export enum Instruction {
    INS_GET_VERSION = 0x00,
    INS_GET_ADDRESS = 0x01,
    INS_SIGN_ATOM = 0x02,
    INS_SIGN_HASH = 0x04,
    INS_GET_PUBLIC_KEY = 0x08,
}

export enum SignPayloadType {
    INIT,
    ADD,
    LAST,
}

export interface Device {
    send: (cla: number,
           ins: number,
           p1: number,
           p2: number,
           data: Buffer) => Promise<Buffer>,
    device: {
        getDeviceInfo: () => {},
    }
}

export interface ConnEvent {
    type: 'add' | 'remove',
    descriptor: string,
    deviceModel: string,
    device: any
}

export enum AppState {
    APP_OPEN,
    APP_CLOSED,
    SIGN_CONFIRM,
    SIGN_REJECT,
}

export interface LedgerApp {
    getPublicKey(bip44: string, p1?: number, p2?: number): Promise<{ publicKey: Buffer }>
    getVersion(): Promise<string>,
    signAtom(bip44: string, atom: any): Promise<any>
    signHash(bip44: string, hash: Buffer): Promise<{ signature: Buffer }>
}


export const CLA = 0xaa
