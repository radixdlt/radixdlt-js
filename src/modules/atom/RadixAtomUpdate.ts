import { RadixAtom } from '../atom_model'

export default interface RadixAtomUpdate {
    action: string
    atom: RadixAtom
}
