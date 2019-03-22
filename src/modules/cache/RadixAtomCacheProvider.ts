import { RadixAddress, RadixAtom } from '../atommodel';

export default interface RadixAtomCacheProvider {
    storeAtom(atom: RadixAtom),
    deleteAtom(atom: RadixAtom),
    getAtoms(keyPair?: RadixAddress): Promise<RadixAtom[]>,
    reset(),
}
