import { RadixSerializableObject, RadixBytes, RadixSerializer, includeJSON, includeDSON } from '..'

@RadixSerializer.registerClass('crypto.ecdsa_signature')
export class RadixECSignature extends RadixSerializableObject {
    
    @includeJSON 
    public r: RadixBytes

    @includeJSON
    public s: RadixBytes

    public static fromEllasticSignature(ecSig) {
        const sig = new RadixECSignature()
        sig.r = new RadixBytes(ecSig.r.toArray())
        sig.s = new RadixBytes(ecSig.s.toArray())

        return sig
    }
}
