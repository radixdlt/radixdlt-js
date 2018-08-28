import RadixWallet from './RadixWallet'
import * as EC from 'elliptic'
import RadixKeyPair from './RadixKeyPair'
import { BehaviorSubject } from 'rxjs/Rx'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as crypto from 'crypto'
import RadixUtil from '../common/RadixUtil'
import { radixConfig } from '../common/RadixConfig'

let ec = new EC.ec('secp256k1')

export enum RadixWalletManagerStates {
  STARTING = 'STARTING',
  FIRST_TIME_SETUP_PASSWORD_REQUIRED = 'FIRST_TIME_SETUP_PASSWORD_REQUIRED',
  DECRYPT_KEYSTORE_PASSWORD_REQUIRED = 'DECRYPT_KEYSTORE_PASSWORD_REQUIRED',
  READY = 'READY'
}

export default class RadixWalletManager {
  wallets: Array<RadixWallet> = []

  state: RadixWalletManagerStates = RadixWalletManagerStates.STARTING
  stateSubject: BehaviorSubject<RadixWalletManagerStates> = new BehaviorSubject(
    RadixWalletManagerStates.STARTING
  )

  private filePath: string

  constructor() {}

  private setState(state: RadixWalletManagerStates) {
    this.state = state
    this.stateSubject.next(state)
  }

  loadWallet() {
    console.log('Loading wallet from ' + radixConfig.walletFileName)
    this.filePath = radixConfig.walletFileName

    // Check if keystore file exists
    fs.pathExists(this.filePath).then(exists => {
      if (exists) {
        this.setState(
          RadixWalletManagerStates.DECRYPT_KEYSTORE_PASSWORD_REQUIRED
        )
      } else {
        this.setState(
          RadixWalletManagerStates.FIRST_TIME_SETUP_PASSWORD_REQUIRED
        )
      }
    })
  }

  setFirstTimePassword(password: string) {
    //Check any requirements
    if (password.length < 6) {
      throw new Error('Password should be at least 6 symbols long')
    }

    const filePath = this.filePath

    //Generate wallet
    const wallet = this.generateWallet()
    const privateKey = wallet.keyPair.getPrivate('hex')
    console.log(privateKey)

    //Derrive key
    const salt = crypto.randomBytes(32).toString('hex')
    const iterations = 100000
    const keylen = 32
    const digest = 'sha512'

    crypto.pbkdf2(
      password,
      salt,
      iterations,
      keylen,
      digest,
      (err, derivedKey) => {
        if (err) {
          throw err
        }
        console.log(derivedKey.toString('hex'))

        // Encrypt private keys with derrived key
        const algorithm = 'aes-256-ctr'
        const iv = crypto.randomBytes(16)
        const cipher = crypto.createCipheriv(algorithm, derivedKey, iv)

        const ciphertext = Buffer.concat([
          cipher.update(privateKey),
          cipher.final()
        ])

        // Compute MAC
        const mac = this.calculateMac(derivedKey, ciphertext)

        const fileContents = {
          crypto: {
            cipher: algorithm,
            cipherparams: {
              iv: iv.toString('hex')
            },
            ciphertext: ciphertext.toString('hex'),
            pbkdfparams: {
              iterations: iterations,
              keylen: keylen,
              digest: digest,
              salt: salt
            },
            mac: mac.toString('hex')
          },
          id: wallet.keyPair.getUID().toString()
        }

        // Write to file
        fs.outputJson(filePath, fileContents)
          .then(() => {
            console.log('Saved key to ' + filePath)
            this.setState(RadixWalletManagerStates.READY)
          })
          .catch(err => {
            console.error(err)
          })
      }
    )
  }

  decryptKeystore(password: string) {
    // Read keystore file
    return fs.readJson(this.filePath).then(fileContents => {
      // Derrive key
      const salt = fileContents.crypto.pbkdfparams.salt
      const iterations = fileContents.crypto.pbkdfparams.iterations
      const keylen = fileContents.crypto.pbkdfparams.keylen
      const digest = fileContents.crypto.pbkdfparams.digest

      const that = this

      return new Promise(function(resolve, reject) {
        crypto.pbkdf2(
          password,
          salt,
          iterations,
          keylen,
          digest,
          (err, derivedKey) => {
            if (err) {
              reject(err)
              return
            }

            // Decrypt ciphertext
            const algorithm = fileContents.crypto.cipher
            const iv = Buffer.from(fileContents.crypto.cipherparams.iv, 'hex')
            const ciphertext = Buffer.from(
              fileContents.crypto.ciphertext,
              'hex'
            )

            // Check MAC
            const mac = Buffer.from(fileContents.crypto.mac, 'hex')
            const computedMac = that.calculateMac(derivedKey, ciphertext)
            if (!computedMac.equals(mac)) {
              reject('MAC mismatch')
              return
            }

            const decipher = crypto.createDecipheriv(algorithm, derivedKey, iv)

            const privateKey = Buffer.concat([
              decipher.update(ciphertext),
              decipher.final()
            ]).toString()
            // console.log(privateKey)

            // Create wallet
            const keyPair = RadixKeyPair.fromPrivate(privateKey)
            let wallet = new RadixWallet(keyPair)
            wallet.initialize()
            that.wallets.push(wallet)

            that.setState(RadixWalletManagerStates.READY)

            resolve()
          }
        )
      })
    })
  }

  private calculateMac(derivedKey: Buffer, ciphertext: Buffer) {
    const dataToMac = Buffer.concat([derivedKey, ciphertext])
    return RadixUtil.hash(dataToMac)
  }

  generateWallet(): RadixWallet {
    let keyPair = RadixKeyPair.generateNew()

    console.log('Generated new wallet')
    console.log(keyPair.getAddress())
    console.log(keyPair.getPublic())
    console.log(keyPair.getUID())

    let wallet = new RadixWallet(keyPair)
    wallet.initialize()
    this.wallets.push(wallet)

    return wallet
  }
}
