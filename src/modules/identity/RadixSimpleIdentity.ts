import RadixECIES from '../crypto/RadixECIES'
import RadixIdentity from './RadixIdentity'

import { RadixAtom, RadixAddress } from '../atommodel'
import { radixHash } from '../common/RadixUtil';

export default class RadixSimpleIdentity extends RadixIdentity {
    constructor(readonly address: RadixAddress) {
        super(address)
    }

    /**
     * Create an instance of a Radix simple identity from an arbitrary byte
     * buffer. This could e.g. be a friendly name of an account, in which
     * case it would be created as <code>Buffer.from('friendly name')</code>.
     *
     * @param seed Buffer seed for the address
     * @returns a new Radix account. 
     */
    public static fromSeed(seed: Buffer) {
        const hash = radixHash(seed)
        return new RadixSimpleIdentity(RadixAddress.fromPrivate(hash))
    }

    public async signAtom(atom: RadixAtom) {
        const signature = this.address.sign(atom.getHash())
        const signatureId = this.address.getUID()

        atom.signatures = { [signatureId.toString()]: signature }

        return atom
    }

    public async decryptECIESPayload(payload: Buffer) {
        return RadixECIES.decrypt(this.address.getPrivate(), payload)
    }

    public getPublicKey() {
        return this.address.getPublic()
    }
}
