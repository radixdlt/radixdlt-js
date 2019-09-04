import { RadixAtomObservation } from '../..'

export default interface RadixAccountSystem {
    name: string
    processAtomUpdate(atomObservation: RadixAtomObservation)
}
