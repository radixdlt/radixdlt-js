import { RadixAtom } from '../RadixAtomModel'

export default interface RadixSignatureProvider {
    signAtom: (atom: RadixAtom) => Promise<RadixAtom>
}
