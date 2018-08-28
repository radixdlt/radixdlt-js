import RadixPayloadAtom from './RadixPayloadAtom'

import * as EC from 'elliptic'
import RadixEncryptor from '../crypto/RadixEncryptor'
import RadixBASE64 from '../common/RadixBASE64'
import RadixECIES from '../crypto/RadixECIES'
import RadixKeyPair from '../wallet/RadixKeyPair'
const ec = new EC.ec('secp256k1')

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
