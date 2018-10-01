import { RadixAtom } from '../RadixAtomModel'

export default interface RadixAtomUpdate {
    action: string
    atom: RadixAtom
}
