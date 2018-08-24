import RadixEUID from '../common/RadixEUID'
import RadixBasicContainer from './RadixBasicContainer'
import RadixBASE64 from '../common/RadixBASE64'

export default class RadixSignature extends RadixBasicContainer {
    static SERIALIZER = -434788200

    r: RadixBASE64
    s: RadixBASE64


    public static fromEllasticSignature(ecSig) {
        let r = ecSig.r.toArray()
        let s = ecSig.s.toArray()
        
        // Pad values
        if (r[0] & 0x80) {
            r = [ 0 ].concat(r)
        }
        if (s[0] & 0x80) {
            s = [ 0 ].concat(s)
        }
        

        let sig = new RadixSignature
        sig.r = new RadixBASE64(r)
        sig.s = new RadixBASE64(s)
        return sig
    }
}
