import { RadixKeyPair, RadixAtom } from '../atom_model';

export default interface RadixAtomCacheProvider {
    storeAtom(atom: RadixAtom),
    deleteAtom(atom: RadixAtom),
    getAtoms(keyPair?: RadixKeyPair): Promise<RadixAtom[]>
}
