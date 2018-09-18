import { RadixPayloadAtom, RadixKeyPair } from '../atom_model'

export default class RadixApplicayionPayloadAtom extends RadixPayloadAtom {
    public static SERIALIZER = -2040291185

    applicationId: string

    constructor(json?: object) {
        super(json)

        this.serializationProperties.push('applicationId')
    }

    public static withEncryptedPayload(
        payload: any,
        recipients: Array<RadixKeyPair>,
        applicationId: string,
        encrypted = true
    ) {
        let atom = new RadixApplicayionPayloadAtom()
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
