import RadixTransaction from './RadixTransaction'

export default interface RadixTransactionUpdate {
    action: string
    hid: string
    transaction?: RadixTransaction
}
