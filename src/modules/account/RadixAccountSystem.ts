import RadixAtom from '../atom/RadixAtom';

export default interface RadixAccountSystem {
    name: string
    processAtom(atom: RadixAtom)
}
