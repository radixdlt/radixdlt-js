# radixdlt-js
A Javascript Client library for interacting with a [Radix](https://www.radixdlt.com) Distributed Ledger. The library, as well as the network itself, are currently in Alpha - please report any issues in the [GitHub issue tracker](https://github.com/radixdlt/radixdlt-js/issues).

## Features
- Full Typescript support
- Read Atoms in any address
- Write Atoms to the ledger

**Coming soon:**
- Use a users account from the Radix Desktop Wallet
- Hardware wallet support

## Installation

`yarn add radixdlt-js` or `npm install radixdlt-js`

> TODO: explain how to do typescript

## Usage

### Initialise Universe
Before you can do anything, you must initialize the library with a Universe configuration. Typically you would want to use ALPHANET.

```
radixUniverse.bootstrap(RadixUniverse.ALPHANET)
```

### Read atoms from a public address
```
const account = RadixAccount.fromAddress('asdfghh')
account.openNodeConnection()

account.transferSystem.balance // This is the account balance
account.transferSystem.transactions // This is a list of transactions

account.transferSystem.transactionSubject.subscribe(transactionUpdate => {
  console.log(transactionUpdate)
})
```

### Read and decrypt atoms from an owned address
```
const identityManager = new RadixIdentityManager()
const identity = identityManager.generateSimpleIdentity()

// Each identity comes with an account, which works the same as any account, but can also decrypt encrypted messages
const account = identity.account

account.openNodeConnection()

// Radix chat messages
account.messageSystem.messages 

// Custom application data 
account.dataSystem.applicationData.get('my-test-application')
```

### Send a transaction
```
const fromIdentity = identityManager.generateSimpleIdentity()
const fromAccount = fromIdentity.account

fromAccount.openNodeConnection()

// Wait for the account to sync data from the ledger

// No need to load data from the ledger for the recipient account
const toAccount = RadixAccount.fromAddress('asdfgfdghfg', true)
const token = 'TEST' // The Radix TEST token
const amount = 123.12

const transactionStatus = RadixTransactionBuilder
  .createTransferAtom(fromAccount, toAccount, token, amount)
  .signAndSubmit(fromIdentity)
                    
transactionStatus.subscribe({
  next: status => {
        console.log(status) 
        // For a valid transaction, this will print, 'FINDING_NODE', 'GENERATING_POW', 'SIGNING', 'STORE', 'STORED'
    },
  complete: () => {console.log('Transaction complete')},
  error: error => {console.error('Error submitting transaction', error)}
})
```

### Send a message
```
const fromIdentity = identityManager.generateSimpleIdentity()
const fromAccount = fromIdentity.account

fromAccount.openNodeConnection()

// Wait for the account to sync data from the ledger

// No need to load data from the ledger for the recipient account
const toAccount = RadixAccount.fromAddress('asdfgfdghfg', true)

const message = 'Hello World!'

const transactionStatus = RadixTransactionBuilder
  .createRadixMessageAtom(fromAccount, toAccount, message)
  .signAndSubmit(fromIdentity)
                    
transactionStatus.subscribe({
  next: status => {
        console.log(status) 
        // For a valid transaction, this will print, 'FINDING_NODE', 'GENERATING_POW', 'SIGNING', 'STORE', 'STORED'
    },
  complete: () => {console.log('Transaction complete')},
  error: error => {console.error('Error submitting transaction', error)}
})
```

### Send an application payload

```
const fromIdentity = identityManager.generateSimpleIdentity()
const fromAccount = fromIdentity.account
fromAccount.openNodeConnection()

// Wait for the account to sync data from the ledger

// No need to load data from the ledger for the recipient account
const toAccount = RadixAccount.fromAddress('asdfgfdghfg', true)

const applicationId = 'my-test-app'
const payload = {
  message: 'Hello World!',
  otherData: 123
}

const transactionStatus = RadixTransactionBuilder
  .createPayloadAtom(fromAccount, toAccount, applicationId, payload)
  .signAndSubmit(fromIdentity)
                    
transactionStatus.subscribe({
  next: status => {
    console.log(status) 
    // For a valid transaction, this will print, 'FINDING_NODE', 'GENERATING_POW', 'SIGNING', 'STORE', 'STORED'
  },
  complete: () => {console.log('Transaction complete')},
  error: error => {console.error('Error submitting transaction', error)}
})
```

### Caching atoms

> TODO: move RadixAtomStore

### Storing private keys

> TODO: add example

## Building

`yarn install && yarn build` or `npm install && npm build`

Run tests with `yarn test:unit`

## License

> TODO: GLP3 or MIT should work (add license & update the package.json accordingly)
