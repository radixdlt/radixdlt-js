import RadixSignatureProvider from './RadixSignatureProvider'
import RadixDecryptionProvider from './RadixDecryptionProvider'
import RadixAccount from '../account/RadixAccount'
import RadixKeyPair from '../wallet/RadixKeyPair'

import { RadixAtom } from '../RadixAtomModel'

export default abstract class RadixIdentity implements RadixSignatureProvider, RadixDecryptionProvider {
    constructor(readonly keyPair: RadixKeyPair) {
        this.account = new RadixAccount(keyPair)
        this.account.enableDecryption(this)
    }

    public abstract signAtom(atom: RadixAtom): Promise<RadixAtom>
    public abstract decryptECIESPayload(payload: Buffer): Promise<Buffer>
    public abstract getPublicKey(): Buffer

    public account: RadixAccount
}
