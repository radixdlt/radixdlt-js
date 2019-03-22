import RadixECIES from '../crypto/RadixECIES'
import RadixIdentity from './RadixIdentity'

import { RadixAtom, RadixAddress } from '../atommodel'

export default class RadixSimpleIdentity extends RadixIdentity {
    constructor(readonly address: RadixAddress) {
        super(address)
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

    public async decryptECIESPayloadWithProtectors(protectors: Buffer[], payload: Buffer) {
        return RadixECIES.decryptWithProtectors(this.address.getPrivate(), protectors, payload)
    }

    public getPublicKey() {
        return this.address.getPublic()
    }
}
