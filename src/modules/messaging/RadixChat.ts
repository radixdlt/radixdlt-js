import RadixMessage from './RadixMessage'
import { TSMap } from 'typescript-map';

export default interface RadixChat {
    address: string
    chat_id: string
    title: string
    last_message_timestamp: number
    messages: TSMap<string, RadixMessage>
}
