import BN from 'bn.js'

export default interface RadixTransaction {
    hid: string
    balance: {[id: string]: BN}
    fee: number
    participants: object
    timestamp: number
    message: string
}
