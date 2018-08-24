// Import here Polyfills if needed. Recommended core-js (npm i -D core-js)
// import 'core-js/fn/array.find'
// ...
import { radixApplication } from './modules/RadixApplication'
import { radixConfig } from './modules/common/RadixConfig'
import * as radixContact from './modules/contacts/RadixContact'
import * as radixChat from './modules/messaging/RadixChat'
import { RadixWalletManagerStates as radixWalletManagerStates } from './modules/wallet/RadixWalletManager'

export { radixApplication, radixConfig, radixContact, radixChat, radixWalletManagerStates }
