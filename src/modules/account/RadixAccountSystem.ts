import { RadixAtomUpdate } from '../RadixAtomModel'

export default interface RadixAccountSystem {
    name: string
    processAtomUpdate(atomUpdate: RadixAtomUpdate)
}
