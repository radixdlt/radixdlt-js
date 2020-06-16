import { Instruction, Device, ConnEvent } from './types'
import { Subscription } from 'rxjs'

const isNodeEnvironment = typeof module !== 'undefined' && this.module !== module

let transportNodeHid
let outResolve

const isImported = new Promise(async (resolve, reject) => {
    outResolve = resolve
})

if (isNodeEnvironment) {
    import('@ledgerhq/hw-transport-node-hid').then(module => {
        transportNodeHid = module.default
        outResolve()
    })
} else {
    throw new Error('Not running in Node environment. This is not supported in the browser.')
}

/*
    Sends an APDU message.
    Specification:
    https://www.blackhat.com/presentations/bh-usa-08/Buetler/BH_US_08_Buetler_SmartCard_APDU_Analysis_V1_0_2.pdf
*/
export async function sendApduMsg(
    cla: number,
    errorHandler,
    responseHandler,
    ins: Instruction,
    data: Buffer,
    p1: number = 0,
    p2: number = 0,
) {
    const device = await openConnection()

    if (cla > 255 || ins > 255 || p1 > 255 || p2 > 255) {
        throw new Error(
            `Parameter validation for ADPU message failed. 
                 Too many bytes given in one or several params.`,
        )
    }
    try {
        return responseHandler(await device.send(cla, ins, p1, p2, data))
    } catch (e) {
        if (!e.statusCode) { throw e }
        throw errorHandler(e.statusCode)
    }
}

export async function subscribe(onConnect: (...args) => any, onDisconnect: (...args) => any): Promise<Subscription> {
    await isImported

    return transportNodeHid.listen({
        next: async (obj: ConnEvent) => {
            switch (obj.type) {
                case 'add':
                    onConnect()
                    break
                case 'remove':
                    onDisconnect()
                    break
            }
        },
    })
}

async function openConnection(): Promise<Device> {
    await isImported

    const devices = await transportNodeHid.list()

    if (!devices[0]) { throw new Error('No device found.') }
    return transportNodeHid.open(devices[0])
}
