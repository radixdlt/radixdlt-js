# radixdlt
A JavaScript client library for interacting with a [Radix](https://www.radixdlt.com) Distributed Ledger. 

This library and the network itself are currently in **Alpha** development phase. Please report any issues in the [GitHub issue tracker](https://github.com/radixdlt/radixdlt-js/issues).

## Introduction

For an overview of the main components of the library and how they fit together, read this blog post [https://www.radixdlt.com/post/introducing-the-radix-javascript-library](https://www.radixdlt.com/post/introducing-the-radix-javascript-library)

## Table of contents

- [Features](#features)
- [Installation](#installation)
- [Example applications](#coming-soon)
- [Code examples](#usage-examples)
  - [Initializing a Universe](#initializing-a-universe)
  - [Reading Atoms from a public address](#reading-atoms-from-a-public-address)
  - [Reading and decrypting Atoms from an owned address](#reading-and-decrypting-atoms-from-an-owned-address)
  - [Sending a Transaction](#sending-a-transaction)
  - [Sending a Message](#sending-a-message)
  - [Storing an application Payload](#storing-an-application-payload)
  - [Caching Atoms](#caching-atoms)
  - [Storing private Keys](#storing-private-keys)
  - [Loading private Keys](#loading-private-keys)
- [Build](#build)
  - [Run](#run)
- [License](#license)

## Features

- Full Typescript support
- Follow the reactive programming pattern using [RxJS](https://rxjs-dev.firebaseapp.com/)
- Cryptography using the [elliptic](https://github.com/indutny/elliptic) library
- Automatically manage connection to the Radix Universe in a sharded environment
- Communication with the Radix network usign RPC over websockets
- Read Atoms in any address
- Write Atoms to the ledger
- End-to-end data encryption using ECIES

## Installation

To install the library using your preferred package manager:

`yarn add radixdlt` or `npm install radixdlt --save`

## Example applications

    * [Front-end example using Vue.js](https://github.com/radixdlt/radixdlt-js-skeleton)
    * [Express.js server example](https://github.com/radixdlt/radixdlt-js-server-example)

## Code examples

In this section we demonstrate a few implementation examples to execute basic tasks with our JavaScript library.

### Initializing a Universe
To run an example, first we need to initialize the library with a Universe configuration. There are different Universes available, such as _ALPHANET_, _HIGHGARDEN_ and _SUNSTONE_. Typically, for development purposes we use **ALPHANET**.

To bootstrap to the test network we just have to call:

```javascript
    radixUniverse.bootstrap(RadixUniverse.ALPHANET)
```

### Reading Atoms from a public address

In the following code snippet we read **Atoms** from the public address _9i9hgAyBQuKvkw7Tg5FEbML59gDmtiwbJwAjBgq5mAU4iaA1ykM_, by opening a **Node** connection and subscribing to the transaction updates. 


```javascript
    const account = RadixAccount.fromAddress('9i9hgAyBQuKvkw7Tg5FEbML59gDmtiwbJwAjBgq5mAU4iaA1ykM')
    account.openNodeConnection()
    
    account.transferSystem.balance // This is the account balance
    account.transferSystem.transactions // This is a list of transactions
    
    
    // Subscribe for any new incoming transactions
    account.transferSystem.transactionSubject.subscribe(transactionUpdate => {
    console.log(transactionUpdate)
    })

    // Subscribe for all previous transactions as well as new ones
    account.transferSystem.getAllTransactions().subscribe(transactionUpdate => {
    console.log(transactionUpdate)
    })
```

### Reading and decrypting Atoms from an owned address

In the following code snippet we read and decrypt **Atoms** from an owned address, by opening a **Node** connection and getting the application data from _my-test-application_.


```javascript
    const identityManager = new RadixIdentityManager()
    const identity = identityManager.generateSimpleIdentity()
    
    // Each identity comes with an account, which works the same as any account, but can also decrypt encrypted messages
    const account = identity.account
    
    account.openNodeConnection()
    
    
    // A list of Radix chat messages in the order of receivng them
    account.messagingSystem.messages 
    // Radix chat messages grouped by the other address
    account.messagingSystem.chats 
    // Subscribe for incoming messages
    account.messagingSystem.messageSubject.subscribe(...)
    // Subscribe for all previous messages as well as new ones
    account.messagingSystem.getAllMessages().subscribe(...)

    // Custom application data 
    account.dataSystem.applicationData.get('my-test-application')
    // Subscribe for all incoming application data
    account.dataSystem.applicationDataSubject.subscribe(...)
    // Subscribe for all previous messages as well as new ones
    account.dataSystem.getApplicationData('my-test-application').subscribe(...)
```

### Sending a Transaction

In the following code snippet we send a **Transaction** from an owned address to the public address _9i9hgAyBQuKvkw7Tg5FEbML59gDmtiwbJwAjBgq5mAU4iaA1ykM_, by creating a transfer **Atom** and signing it with our **Identity**. Finally we get the results by subscribing to the transaction updates.


```javascript
    const myIdentity = identityManager.generateSimpleIdentity()
    const myAccount = myIdentity.account
    myAccount.openNodeConnection()
    
    // Wait for the account to sync data from the ledger
    
    // No need to load data from the ledger for the recipient account
    const toAccount = RadixAccount.fromAddress('9i9hgAyBQuKvkw7Tg5FEbML59gDmtiwbJwAjBgq5mAU4iaA1ykM', true)
    const token = 'TEST' // The Radix TEST token
    const amount = 123.12
    
    const transactionStatus = RadixTransactionBuilder
      .createTransferAtom(myAccount, toAccount, token, amount)
      .signAndSubmit(myIdentity)
                        
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

### Sending a Message

In the following code snippet we send a **Message** from an owned address to the public address _9i9hgAyBQuKvkw7Tg5FEbML59gDmtiwbJwAjBgq5mAU4iaA1ykM_, by creating a message **Atom** and signing it with our **Identity**. Finally we get the results by subscribing to the transaction updates.


```javascript
    const myIdentity = identityManager.generateSimpleIdentity()
    const myAccount = myIdentity.account
    myAccount.openNodeConnection()
    
    // Wait for the account to sync data from the ledger
    
    // No need to load data from the ledger for the recipient account
    const toAccount = RadixAccount.fromAddress('9i9hgAyBQuKvkw7Tg5FEbML59gDmtiwbJwAjBgq5mAU4iaA1ykM', true)
    
    const message = 'Hello World!'
    
    const transactionStatus = RadixTransactionBuilder
      .createRadixMessageAtom(myAccount, toAccount, message)
      .signAndSubmit(myIdentity)
                        
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

### Storing an application Payload

In the following code snippet we store a **Payload** to the application _my-test-app_ for an owned address and the public address _9i9hgAyBQuKvkw7Tg5FEbML59gDmtiwbJwAjBgq5mAU4iaA1ykM_, by creating a payload **Atom** and signing it with our **Identity**. Finally we get the results by subscribing to the transaction updates.


```javascript
    const myIdentity = identityManager.generateSimpleIdentity()
    const myAccount = myIdentity.account
    myAccount.openNodeConnection()
    
    // Wait for the account to sync data from the ledger
    
    // No need to load data from the ledger for the recipient account
    const toAccount = RadixAccount.fromAddress('9i9hgAyBQuKvkw7Tg5FEbML59gDmtiwbJwAjBgq5mAU4iaA1ykM', true)
    
    const applicationId = 'my-test-app'
    const payload = JSON.stringify({
      message: 'Hello World!',
      otherData: 123
    })
    
    const transactionStatus = RadixTransactionBuilder
      .createPayloadAtom([myAccount, toAccount], applicationId, payload)
      .signAndSubmit(myIdentity)
                        
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

### Caching Atoms

In the following code snippet we cache **Atoms** from the public address _9i9hgAyBQuKvkw7Tg5FEbML59gDmtiwbJwAjBgq5mAU4iaA1ykM_, by defining a _'path/to/file'_ and enabling the account's cache.


```javascript
    import {RadixNEDBAtomCache} from 'radix'

    const account = RadixAccount.fromAddress('9i9hgAyBQuKvkw7Tg5FEbML59gDmtiwbJwAjBgq5mAU4iaA1ykM')
    const atomCache = new RadixNEDBAtomCache('path/to/file')
    account.enableCache(atomCache) // This will read all atoms in cache, as well as store new ones in the future

    account.openNodeConnection()
```

### Storing private Keys

In the following code snippet we encrypt the private key of an identity using the passowrd _SuperDuperSecretPassword_. The resulting json object can be stored to a file, or in localstorage in a browser. This key storage format is compatible with the Radix Desktop and Android wallet applications.


```javascript
    const identity = identityManager.generateSimpleIdentity()

    const password = 'SuperDuperSecretPassword'
    RadixKeyStore.encryptKey(identity.keyPair, password).then((encryptedKey) => {
        console.log('Private key encrypted')
    }).catch((error) => {
        console.error('Error encrypting private key', error)
    })
```

### Loading private Keys

In the following code snippet we decrypt a private key using _SuperDuperSecretPassword_ as the decryption password.


```javascript
    const encryptedKey = loadKeyFromStorage() // This object is what you get from RadixKeyStore.encryptKey(...)
    const password = 'SuperDuperSecretPassword'
    RadixKeyStore.decryptKey(encryptedKey, password).then((keyPair) => {
        console.log('Private key successfuly decrypted')

        const identity = new RadixSimpleIdentity(keyPair)
    }).catch((error) => {
        console.error('Error decrypting private key', error)
    })
```

## Build

To build the library using your preferred package manager:

`yarn install && yarn build` or `npm install && npm build`

### Run

Run tests with `yarn test`

## License

Copyright 2018 RADIX DLT Ltd.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
