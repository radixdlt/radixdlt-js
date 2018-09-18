import { RadixAtom } from '../atom_model'

export default interface RadixAccountSystem {
    name: string
    processAtom(atom: RadixAtom)
}
