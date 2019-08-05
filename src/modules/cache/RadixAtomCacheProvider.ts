import { RadixAddress, RadixAtom } from '../atommodel';

export default interface RadixAtomCacheProvider {
    storeAtom(atom: RadixAtom): Promise<boolean>,
    deleteAtom(atom: RadixAtom),
    getAtoms(address?: RadixAddress): Promise<RadixAtom[]>,
    reset(),
}
