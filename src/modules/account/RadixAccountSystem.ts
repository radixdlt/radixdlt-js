import { RadixAtomUpdate } from '../atom_model'

export default interface RadixAccountSystem {
    name: string
    processAtomUpdate(atomUpdate: RadixAtomUpdate)
}
