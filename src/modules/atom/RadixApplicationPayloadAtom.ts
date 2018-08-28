import RadixPayloadAtom from './RadixPayloadAtom'

import * as EC from 'elliptic'
import RadixEncryptor from '../crypto/RadixEncryptor'
import RadixBASE64 from '../common/RadixBASE64'
import RadixECIES from '../crypto/RadixECIES'
import RadixKeyPair from '../wallet/RadixKeyPair'
const ec = new EC.ec('secp256k1')

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

    //Destinations
    atom.destinations = []
    for (let recipient of recipients) {
      atom.destinations.push(recipient.getUID())
    }

    //action
    atom.action = 'STORE'
    atom.timestamps = { default: Date.now() }

    return atom
  }
}
