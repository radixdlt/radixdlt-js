import RadixEUID from '../common/RadixEUID'
import RadixKeyPair from '../wallet/RadixKeyPair'


export default interface RadixMessage { 
    atom_hid: RadixEUID
    chat_id: string
    to: RadixKeyPair
    from: RadixKeyPair
    is_mine: boolean
    content: string
    timestamp: number
}
