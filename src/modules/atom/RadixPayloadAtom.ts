import RadixAtom from './RadixAtom'
import RadixEncryptor from '../crypto/RadixEncryptor'
import RadixKeyPair from '../wallet/RadixKeyPair'
import RadixBASE64 from '../common/RadixBASE64'
import RadixECIES from '../crypto/RadixECIES'

import * as EC from 'elliptic'
const ec = new EC.ec('secp256k1')

export default abstract class RadixPayloadAtom extends RadixAtom {
  encryptor: RadixEncryptor
  encrypted: RadixBASE64

  constructor(json?: object) {
    super(json)

    this.serializationProperties.push('encrypted')
    this.serializationProperties.push('encryptor')
  }

  public getDecryptedPayload(keyPair: RadixKeyPair): any {
    if (this.encrypted && this.encryptor) {
      const rawPayload = this.encryptor.decrypt(this.encrypted, keyPair)
      const payload = JSON.parse(rawPayload.toString())

      return payload
    } else if (this.encrypted) {
      const payload = this.encrypted.data.toString()
      return payload
    }

    throw new Error('No payoad')
  }

  public addEncryptedPayload(payload: any, recipients: Array<RadixKeyPair>) {
    // Generate key pair
    let ephemeral = ec.genKeyPair()

    // Encrypt key with receivers
    let encryptor = new RadixEncryptor()
    encryptor.protectors = []

    for (let recipient of recipients) {
      encryptor.protectors.push(
        new RadixBASE64(
          RadixECIES.encrypt(
            recipient.getPublic(),
            Buffer.from(ephemeral.getPrivate('hex'), 'hex')
          )
        )
      )
    }

    this.encryptor = encryptor

    // Encrypt message
    this.encrypted = new RadixBASE64(
      RadixECIES.encrypt(
        ephemeral.getPublic(),
        Buffer.from(JSON.stringify(payload))
      )
    )
  }

  public addUnencryptedPayload(payload: any) {
    // TODO: transaction message payloads are raw strings not json
    this.encrypted = new RadixBASE64(Buffer.from(payload))
  }
}
