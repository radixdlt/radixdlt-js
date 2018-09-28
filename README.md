# radixdlt-js
A Javascript Client library for interacting with a [Radix](https://www.radixdlt.com) Distributed Ledger. The library, as well as the network itself, are currently in Alpha - please report any issues in the [GitHub issue tracker](https://github.com/radixdlt/radixdlt-js/issues).

## Features

- Full Typescript support
- Read Atoms in any address
- Write Atoms to the ledger

### Coming soon:

- Use a users account from the Radix Desktop Wallet
- Hardware wallet support

## Installation

`yarn add radixdlt-js` or `npm install radixdlt-js`

> TODO: explain how to do typescript

## Usage

### Initialise Universe
Before you can do anything, you must initialize the library with a Universe configuration. Typically you would want to use ALPHANET.


```javascript
    radixUniverse.bootstrap(RadixUniverse.ALPHANET)
```

### Read atoms from a public address

```javascript
    const account = RadixAccount.fromAddress('9i9hgAyBQuKvkw7Tg5FEbML59gDmtiwbJwAjBgq5mAU4iaA1ykM')
    account.openNodeConnection()
    
    account.transferSystem.balance // This is the account balance
    account.transferSystem.transactions // This is a list of transactions
    
    account.transferSystem.transactionSubject.subscribe(transactionUpdate => {
      console.log(transactionUpdate)
    })
```

### Read and decrypt atoms from an owned address

```javascript
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

```javascript
    const fromIdentity = identityManager.generateSimpleIdentity()
    const fromAccount = fromIdentity.account
    fromAccount.openNodeConnection()
    
    // Wait for the account to sync data from the ledger
    
    // No need to load data from the ledger for the recipient account
    const toAccount = RadixAccount.fromAddress('9i9hgAyBQuKvkw7Tg5FEbML59gDmtiwbJwAjBgq5mAU4iaA1ykM', true)
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
    }
    )
```

### Send a message

```javascript
    const fromIdentity = identityManager.generateSimpleIdentity()
    const fromAccount = fromIdentity.account
    fromAccount.openNodeConnection()
    
    // Wait for the account to sync data from the ledger
    
    // No need to load data from the ledger for the recipient account
    const toAccount = RadixAccount.fromAddress('9i9hgAyBQuKvkw7Tg5FEbML59gDmtiwbJwAjBgq5mAU4iaA1ykM', true)
    
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
    }
    )
```

### Send an application payload

```javascript
    const fromIdentity = identityManager.generateSimpleIdentity()
    const fromAccount = fromIdentity.account
    fromAccount.openNodeConnection()
    
    // Wait for the account to sync data from the ledger
    
    // No need to load data from the ledger for the recipient account
    const toAccount = RadixAccount.fromAddress('9i9hgAyBQuKvkw7Tg5FEbML59gDmtiwbJwAjBgq5mAU4iaA1ykM', true)
    
    const applicationId = 'my-test-app'
    const payload = {
      message: 'Hello World!',
      otherData: 123
    }
    
    const transactionStatus = RadixTransactionBuilder
      .createPayloadAtom([fromAccount, toAccount], applicationId, payload)
      .signAndSubmit(fromIdentity)
                        
    transactionStatus.subscribe({
      next: status => {
            console.log(status) 
            // For a valid transaction, this will print, 'FINDING_NODE', 'GENERATING_POW', 'SIGNING', 'STORE', 'STORED'
        },
      complete: () => {console.log('Transaction complete')},
      error: error => {console.error('Error submitting transaction', error)}
    }
    )
```    

### Caching atoms

```javascript
    import {RadixNEDBAtomCache} from 'radix'

    const account = RadixAccount.fromAddress('9i9hgAyBQuKvkw7Tg5FEbML59gDmtiwbJwAjBgq5mAU4iaA1ykM')
    const atomCache = new RadixNEDBAtomCache('path/to/file')
    account.enableCache(atomCache) // This will read all atoms in cache, as well as store new ones in the future

    account.openNodeConnection()
```

### Storing private keys

```javascript
    const identity = identityManager.generateSimpleIdentity()

    const path = 'path/to/keystore'
    const password = 'SuperDuperSecretPassword'
    RadixKeyStore.storeKey(path, identity.keyPair, password).then((fileContents) => {
        console.log('Private key successfuly stored')
    }).catch((error) => {
        conole.error('Error storing private key', error)
    })
```

```javascript
    const path = 'path/to/keystore'
    const password = 'SuperDuperSecretPassword'
    RadixKeyStore.loadKey(path, password).then((keyPair) => {
        console.log('Private key successfuly loaded')

        const identity = new RadixSimpleIdentity(keyPair)
    }).catch((error) => {
        conole.error('Error loading private key', error)
    })
```

## Building

`yarn install && yarn build` or `npm install && npm build`

Run tests with `yarn test:unit`

## License

> TODO: GLP3 or MIT should work (add license & update the package.json accordingly)
