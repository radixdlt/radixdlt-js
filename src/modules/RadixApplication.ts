import RadixWalletManager from './wallet/RadixWalletManager'
import { radixNodeManager } from './node/RadixNodeManager'
import { radixAtomStore } from './RadixAtomStore'
import { radixConfig } from './common/RadixConfig'
import * as events from 'events'
import fs from 'fs-extra'

export declare interface RadixApplication {
  on(event: 'atom-received:transaction', listener: () => void): this
  on(event: 'atom-received:message', listener: () => void): this
  on(event: 'contact-added', listener: () => void): this
  on(event: string, listener: Function): this
}

export class RadixApplication extends events.EventEmitter {
  walletManager = new RadixWalletManager()

  constructor() {
    super()
  }

  initialize(dataDir: string) {
    //Set up config
    radixConfig.dataDir = dataDir
    radixConfig.walletFileName = radixConfig.dataDir + '/keystore.json'
    radixConfig.atomDBFileName =
      radixConfig.dataDir + `/atoms-${radixConfig.dbVersion}.db`
    radixConfig.contactsFileName = radixConfig.dataDir + '/contacts.json'

    radixConfig.authDBFileName = radixConfig.dataDir + `/apps.db`

    // Initialize db
    radixAtomStore.initialize()

    // Load wallet
    this.walletManager.loadWallet()
  }

  deleteWallet() {
    fs.removeSync(radixConfig.walletFileName)
  }

  deleteAtomsDB() {
    radixAtomStore.reset()
  }

  onQuit = () => {
    console.log('Quitting')
    radixNodeManager.closeAllConnections()
    //Persist transactions
  }
}

export let radixApplication = new RadixApplication()
