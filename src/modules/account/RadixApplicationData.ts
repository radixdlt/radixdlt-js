import { RadixDecryptedData } from './RadixDecryptionAccountSystem';

export default interface RadixApplicationData {
    hid: string
    payload: RadixDecryptedData
    timestamp: number
    signatures: object
}
