import * as EC from 'elliptic'
import * as bs58 from 'bs58'
import RadixUtil from '../common/RadixUtil'
import RadixEUID from '../common/RadixEUID'
import RadixECKeyPair from '../atom/RadixECKeyPair'
import RadixSignature from '../atom/RadixSignature'
import * as BN from 'bn.js'
const ec = new EC.ec('secp256k1')

import { radixUniverse } from '../universe/RadixUniverse'
const universe = radixUniverse

export default class RadixKeyPair {
  public keyPair: EC.ec

  public static generateNew() {
    let radixKeyPair = new RadixKeyPair()
    radixKeyPair.keyPair = ec.genKeyPair()

    return radixKeyPair
  }

  public static fromAddress(address: string) {
    let raw = Array.prototype.slice.call(bs58.decode(address), 0)

    // Universe check
    if (universe.getMagicByte() != raw[0]) {
      throw new Error('Address is from a different universe')
    }

    // Checksum
    let check = RadixUtil.hash(raw.splice(0, raw.length - 4), 0, raw.length - 4)
    for (let i = 0; i < 4; i++) {
      if (check[i] != raw[raw.length - 4 + i]) {
        throw new Error('Invalid address')
      }
    }

    raw = Array.prototype.slice.call(bs58.decode(address), 0)

    let radixKeyPair = new RadixKeyPair()
    radixKeyPair.keyPair = ec.keyFromPublic(raw.splice(1, raw.length - 5))

    return radixKeyPair
  }

  public static fromPublic(publicKey: Buffer) {
    if (!publicKey) {
      throw 'Missing public key'
    }
    if (publicKey.length != 33) {
      throw 'Public key must be 33 bytes, but was ' + publicKey.length
    }

    let radixKeyPair = new RadixKeyPair()
    radixKeyPair.keyPair = ec.keyFromPublic(publicKey)

    return radixKeyPair
  }

  public static fromPrivate(privateKey: Buffer | string) {
    let radixKeyPair = new RadixKeyPair()
    radixKeyPair.keyPair = ec.keyFromPrivate(privateKey)
    return radixKeyPair
  }

  public static fromRadixECKeyPair(keyPair: RadixECKeyPair) {
    return this.fromPublic(keyPair.public.data)
  }

  public getAddress() {
    let publicKey = this.keyPair.getPublic().encode('be', true)
    let addressBytes: any = []

    addressBytes[0] = universe.getMagicByte()
    for (let i = 0; i < publicKey.length; i++) {
      addressBytes[i + 1] = publicKey[i]
    }

    let check = RadixUtil.hash(addressBytes, 0, publicKey.length + 1)
    for (let i = 0; i < 4; i++) {
      addressBytes[publicKey.length + 1 + i] = check[i]
    }

    return bs58.encode(addressBytes)
  }

  getHash() {
    return RadixUtil.hash(this.getPublic(), 0, this.getPublic().length)
  }

  getUID() {
    let hash = this.getHash()

    return new RadixEUID(hash.slice(0, 12))
  }

  getShard(): Long {
    return RadixUtil.longFromBigInt(this.getUID().value)
  }

  getPublic(): Buffer {
    return Buffer.from(this.keyPair.getPublic().encode('be', true))
  }

  getPrivate(enc?: string): BN | string {
    return this.keyPair.getPrivate(enc)
  }

  sign(data: Buffer) {
    let signature = this.keyPair.sign(data)
    return RadixSignature.fromEllasticSignature(signature)
  }

  verify(data: Buffer, signature: RadixSignature) {
    return this.keyPair.verify(data, EC.Signature(signature))
  }

  equals(otherKeyPair: RadixKeyPair) {
    return this.getAddress() == otherKeyPair.getAddress()
  }

  toString() {
    return this.getAddress()
  }
}
