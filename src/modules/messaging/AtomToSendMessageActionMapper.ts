import RadixAccount from '../account/RadixAccount'
import { RadixAtom } from '../atommodel'
import RadixDecryptionProvider from '../identity/RadixDecryptionProvider'
import SendMessageAction from './SendMessageAction'

const mapAtomToSendMessageAction = (
    atom: RadixAtom,
    decryptionProvider: RadixDecryptionProvider,
): Promise<SendMessageAction> => {

}
