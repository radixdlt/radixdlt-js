import { RadixAtom } from '.';

export interface RadixAtomUpdate {
    action: string
    atom: RadixAtom
    isHead: boolean
}
