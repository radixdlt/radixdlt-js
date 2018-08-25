import RadixMessage from './RadixMessage'
import RadixKeyPair from '../wallet/RadixKeyPair'

export default interface RadixChat {
  address: string
  chat_id: string
  title: string
  last_message_timestamp: number
  messages: Array<RadixMessage>
}
