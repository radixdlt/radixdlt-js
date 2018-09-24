import { RadixMessage } from '../..';

export default interface RadixMessageUpdate {
    action: string
    hid: string
    message: RadixMessage
}
