import { RadixKeyPair } from '../atom_model'

export default interface RadixMessage {
    hid: string
    chat_id: string
    to: RadixKeyPair
    from: RadixKeyPair
    is_mine: boolean
    content: string
    timestamp: number
}
