import RadixAtom from '../atom/RadixAtom';

export default interface RadixSignatureProvider {
    signAtom: (atom: RadixAtom) => Promise<RadixAtom>
}
