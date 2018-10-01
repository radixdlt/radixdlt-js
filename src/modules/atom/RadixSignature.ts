import { RadixBasicContainer, RadixBase64 } from '../RadixAtomModel'

export default class RadixSignature extends RadixBasicContainer {
    static SERIALIZER = -434788200

    r: RadixBase64
    s: RadixBase64

    public static fromEllasticSignature(ecSig) {
        let r = ecSig.r.toArray()
        let s = ecSig.s.toArray()

        // Pad values
        if (r[0] & 0x80) {
            r = [0].concat(r)
        }
        if (s[0] & 0x80) {
            s = [0].concat(s)
        }

        let sig = new RadixSignature()
        sig.r = new RadixBase64(r)
        sig.s = new RadixBase64(s)
        return sig
    }
}
