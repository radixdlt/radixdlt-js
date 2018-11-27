import { RadixSerializableObject, RadixBytes, RadixSerializer, includeJSON, includeDSON } from '..'

@RadixSerializer.registerClass('SIGNATURE')
export class RadixECSignature extends RadixSerializableObject {
    
    @includeJSON 
    public r: RadixBytes

    @includeJSON
    public s: RadixBytes

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

        const sig = new RadixECSignature()
        sig.r = new RadixBytes(r)
        sig.s = new RadixBytes(s)
        return sig
    }
}
