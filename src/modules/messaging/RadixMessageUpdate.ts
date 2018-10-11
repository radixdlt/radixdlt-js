import RadixMessage from '../messaging/RadixMessage'

export default interface RadixMessageUpdate {
    action: string
    hid: string
    message: RadixMessage
}
