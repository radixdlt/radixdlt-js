import { Instruction, Device } from './types'
import { Subscription, identity } from 'rxjs'

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

interface ConnEvent {
    type: 'add' | 'remove',
    descriptor: string,
    deviceModel: string,
    device: any
}


export async function openConnection(): Promise<Device> {
    await isImported

    return new Promise((resolve, reject) => {
        const subscription = transportNodeHid.listen({
            next: async (obj) => {
                subscription.unsubscribe()
                const device = await transportNodeHid.open(obj.path)
                resolve(device)
            }
        })
    })
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
        }
    })
}

/*
       Defines a method for sending an APDU message.
       Specification:
       https://www.blackhat.com/presentations/bh-usa-08/Buetler/BH_US_08_Buetler_SmartCard_APDU_Analysis_V1_0_2.pdf
   */
// TODO do we need statusList param? https://github.com/LedgerHQ/ledgerjs/blob/fc435a9611e9e3554d0d4be2939e6da44ba20735/packages/hw-transport/src/Transport.js#L194
export function sendApduMsg(
    ins: Instruction,
    data: Buffer,
    p1: number,
    p2: number,
    cla: number,
) {
    return (errorHandler: Function) => async (device: Device) => {
        if (cla > 255 || ins > 255 || p1 > 255 || p2 > 255) {
            throw new Error(
                `Parameter validation for ADPU message failed. 
                 Too many bytes given in one or several params.`,
            )
        }
        try {
            return await device.send(cla, ins, p1, p2, data)
        } catch (e) {
            throw errorHandler(e)
        }
    }
}
