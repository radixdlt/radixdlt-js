import { RadixAddress } from '../atommodel'

export default interface RadixMessage {
    hid: string
    chat_id: string
    to: RadixAddress
    from: RadixAddress
    is_mine: boolean
    content: string
    timestamp: number
}
