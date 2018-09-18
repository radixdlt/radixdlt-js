import RadixSignatureProvider from './RadixSignatureProvider';
import RadixDecryptionProvider from './RadixDecryptionProvider';
import RadixAccount from '../account/RadixAccount';

import {RadixAtom,
    } from '../atom_model'


export default abstract class RadixIdentity implements RadixSignatureProvider, RadixDecryptionProvider {
    public abstract signAtom(atom: RadixAtom): Promise<RadixAtom>
    public abstract decryptECIESPayload(payload: Buffer): Promise<Buffer>
    public abstract getPublicKey(): Buffer

    public account: RadixAccount
}
