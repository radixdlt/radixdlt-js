import RadixApplicationData from './RadixApplicationData'

export default interface RadixApplicationDataUpdate {
    action: string
    hid: string
    applicationId: string
    data: RadixApplicationData
    signatures: object
}
