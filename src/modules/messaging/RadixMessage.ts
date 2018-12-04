import { RadixAddress } from '../atommodel'
import { RadixDecryptionState } from '../account/RadixDecryptionAccountSystem';

export default interface RadixMessage {
    hid: string
    chat_id: string
    to: RadixAddress
    from: RadixAddress
    is_mine: boolean
    content: string
    timestamp: number,
    encryptionState: RadixDecryptionState,
}
