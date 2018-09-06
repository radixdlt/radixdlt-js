import * as BufferReader from 'buffer-reader'
import * as EC from 'elliptic'
import * as crypto from 'crypto'

const ec = new EC.ec('secp256k1')

export default class RadixECIES {
  static decrypt(privKey: Buffer, encrypted: Buffer) {
    let reader = new BufferReader(encrypted)

    const iv = reader.nextBuffer(16)
    const ephemPubKeyEncoded = reader.nextBuffer(reader.nextUInt8())
    const ciphertext = reader.nextBuffer(reader.nextUInt32BE())
    const mac = reader.nextBuffer(32)

    const ephemPubKey = ec.keyFromPublic(ephemPubKeyEncoded).getPublic()

    const px = ec.keyFromPrivate(privKey).derive(ephemPubKey)
    // Double hash to prevent length extension attacks
    const hash = crypto
      .createHash('sha512')
      .update(
        crypto
          .createHash('sha512')
          .update(px.toBuffer())
          .digest()
      )
      .digest()
    const encryptionKey = hash.slice(0, 32)
    const macKey = hash.slice(32)

    const computedMac = this.calculateMac(
      macKey,
      iv,
      ephemPubKeyEncoded,
      ciphertext
    )

    // Verify Mac
    if (!computedMac.equals(mac)) {
      throw new Error('MAC mismatch')
    }

    const plaintext = this.AES256CbcDecrypt(iv, encryptionKey, ciphertext)
    return plaintext
  }

  static encrypt(pubKeyTo: Buffer, plaintext: Buffer) {
    const ephemPrivKey = ec.keyFromPrivate(crypto.randomBytes(32))
    const ephemPubKey = ephemPrivKey.getPublic()
    const ephemPubKeyEncoded = Buffer.from(ephemPubKey.encode('be', true))
    // Every EC public key begins with the 0x04 prefix before giving the location of the two point on the curve
    // const px = ephemPrivKey.derive(ec.keyFromPublic(Buffer.concat([Buffer.from([0x04]), pubKeyTo])).getPublic())
    const px = ephemPrivKey.derive(ec.keyFromPublic(pubKeyTo).getPublic(true))
    // Double hash to preven lenght extension attacks
    const hash = crypto
      .createHash('sha512')
      .update(
        crypto
          .createHash('sha512')
          .update(px.toBuffer())
          .digest()
      )
      .digest()
    const iv = crypto.randomBytes(16)
    const encryptionKey = hash.slice(0, 32)
    const macKey = hash.slice(32)
    const ciphertext = this.AES256CbcEncrypt(iv, encryptionKey, plaintext)
    const mac = this.calculateMac(macKey, iv, ephemPubKeyEncoded, ciphertext)

    let offset = 0
    let serializedCiphertext = new Buffer(
      iv.length +
        1 +
        ephemPubKeyEncoded.length +
        4 +
        ciphertext.length +
        mac.length
    )

    // iv
    iv.copy(serializedCiphertext, 0)
    offset += iv.length

    // Ephemeral key
    serializedCiphertext.writeUInt8(ephemPubKeyEncoded.length, offset)
    offset++
    ephemPubKeyEncoded.copy(serializedCiphertext, offset)
    offset += ephemPubKeyEncoded.length

    // Ciphertext
    serializedCiphertext.writeUInt32BE(ciphertext.length, offset)
    offset += 4
    ciphertext.copy(serializedCiphertext, offset)
    offset += ciphertext.length

    // MAC
    mac.copy(serializedCiphertext, offset)

    return serializedCiphertext
  }

  static calculateMac(
    macKey: Buffer,
    iv: Buffer,
    ephemPubKeyEncoded: Buffer,
    ciphertext: Buffer
  ) {
    const dataToMac = Buffer.concat([iv, ephemPubKeyEncoded, ciphertext])
    return crypto
      .createHmac('sha256', macKey)
      .update(dataToMac)
      .digest()
  }

  /**
   * AES-256 CBC encrypt
   * @param {Buffer} iv
   * @param {Buffer} key
   * @param {Buffer} plaintext
   * @returns {Buffer} ciphertext
   */
  static AES256CbcEncrypt = (iv: Buffer, key: Buffer, plaintext: Buffer) => {
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
    const firstChunk = cipher.update(plaintext)
    const secondChunk = cipher.final()
    return Buffer.concat([firstChunk, secondChunk])
  }

  /**
   * AES-256 CBC decrypt
   * @param {Buffer} iv
   * @param {Buffer} key
   * @param {Buffer} ciphertext
   * @returns {Buffer} plaintext
   */
  static AES256CbcDecrypt = (iv: Buffer, key: Buffer, ciphertext: Buffer) => {
    const cipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    const firstChunk = cipher.update(ciphertext)
    const secondChunk = cipher.final()
    return Buffer.concat([firstChunk, secondChunk])
  }
}
