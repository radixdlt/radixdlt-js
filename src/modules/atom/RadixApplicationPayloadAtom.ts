import { RadixPayloadAtom, RadixKeyPair } from '../RadixAtomModel'

export default class RadixApplicationPayloadAtom extends RadixPayloadAtom {
    public static SERIALIZER = -2040291185

    applicationId: string

    constructor(json?: object) {
        super(json)

        this.serializationProperties.push('applicationId')
    }

    public static withEncryptedPayload(
        payload: string,
        recipients: RadixKeyPair[],
        applicationId: string,
        encrypted = true,
    ) {
        let atom = new RadixApplicationPayloadAtom()
        atom.applicationId = applicationId

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
