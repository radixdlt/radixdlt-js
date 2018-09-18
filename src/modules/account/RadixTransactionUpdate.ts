import RadixTransaction from './RadixTransaction'

export default interface RadixTransactionUpdate {
    type: string
    hid: string
    transaction?: RadixTransaction
}
