import { RadixPayloadAtom, RadixKeyPair } from '../atom_model'

import * as Long from 'long'

export default class RadixBasicPayloadAtom extends RadixPayloadAtom {
    public static SERIALIZER = -257259791

    constructor(json?: object) {
        super(json)
    }
    public static withEncryptedPayload(
        payload: any,
        recipients: Array<RadixKeyPair>,
        encrypted = true
    ) {
        let atom = new RadixBasicPayloadAtom()

        if (encrypted) {
            atom.addEncryptedPayload(payload, recipients)
        } else {
            atom.addUnencryptedPayload(payload)
        }

        // Destinations
        atom.destinations = []
        for (let recipient of recipients) {
            atom.destinations.push(recipient.getUID())
        }

        // Action
        atom.action = 'STORE'
        atom.timestamps = { default: Date.now() }

        return atom
    }
}
