import RadixSignatureProvider from './RadixSignatureProvider'
import RadixDecryptionProvider from './RadixDecryptionProvider'
import RadixAccount from '../account/RadixAccount'
import { RadixAddress, RadixAtom } from '../atommodel';

export default abstract class RadixIdentity implements RadixSignatureProvider, RadixDecryptionProvider {
    constructor(readonly address: RadixAddress) {
        this.account = new RadixAccount(address)
        this.account.enableDecryption(this)
    }

    public abstract signAtom(atom: RadixAtom): Promise<RadixAtom>
    public abstract decryptECIESPayload(payload: Buffer): Promise<Buffer>
    public abstract decryptECIESPayloadWithProtectors(protectors: Buffer[], payload: Buffer): Promise<Buffer>
    public abstract getPublicKey(): Buffer

    public account: RadixAccount
}
