import { RadixAtom } from '../atom_model'

export default interface RadixSignatureProvider {
    signAtom: (atom: RadixAtom) => Promise<RadixAtom>
}
