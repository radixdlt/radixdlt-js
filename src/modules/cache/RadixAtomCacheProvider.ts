import { RadixKeyPair, RadixAtom } from '../RadixAtomModel'

export default interface RadixAtomCacheProvider {
    storeAtom(atom: RadixAtom),
    deleteAtom(atom: RadixAtom),
    getAtoms(keyPair?: RadixKeyPair): Promise<RadixAtom[]>,
    reset(),
}
