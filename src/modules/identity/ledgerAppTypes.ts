export enum APDUBytes {
    CLA = 'aa',
    INS_GET_PUBLIC_KEY = '08',
    INS_SIGN_ATOM = '02',
    P1_0 = '00',
    P1_2 = '02',
    P2_0 = '00',
    L_HD_PATH = '0c',
    HD_PATH = `800000000000000000000000`,
}

export enum HDPathParts {
    ZERO = '00000000',
    ZERO_HARDENED = '80000000',
}

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
    SW_USER_REJECTED = 0x6900,
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

export enum Handler {
    GET_VERSION,
    GET_PUBLIC_KEY,
    SIGN_ATOM,
}

export interface Device {
    send: (cla: number,
        ins: number,
        p1: number,
        p2: number,
        data: Buffer) => Promise<Buffer>,
    device: {
        getDeviceInfo: () => {}
    }
}