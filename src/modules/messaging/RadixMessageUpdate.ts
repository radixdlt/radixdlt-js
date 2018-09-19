import { RadixMessage } from '../..';

export default interface RadixMessageUpdate {
    type: string
    hid: string
    message: RadixMessage
}
