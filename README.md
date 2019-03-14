[![License MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/radixdlt/radixdlt-js/blob/master/LICENSE)
[![Build Status](https://travis-ci.com/radixdlt/radixdlt-js.svg?branch=master)](https://travis-ci.com/radixdlt/radixdlt-js)
# radixdlt-js library

A JavaScript client library for interacting with a [Radix](https://www.radixdlt.com) Distributed Ledger. 

This library and the network itself are currently in **Alpha** development phase. Please report any issues in the [GitHub issue tracker](https://github.com/radixdlt/radixdlt-js/issues).

## Introduction

For an overview of the main components of the library and how they fit together, read this [blog post](https://www.radixdlt.com/post/introducing-the-radix-javascript-library).

## Table of contents

- [Features](#features)
- [Installation](#installation)
- [Build](#build)
- [Example applications](#example-applications)
- [Code examples](#code-examples)
- [Known issues](#known-issues)
- [Contribute](#contribute)
- [Links](#links)
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

## Build

To build the library using your preferred package manager:

`yarn install && yarn build` or `npm install && npm build`

### Test

Run tests with `yarn test`.

## Example applications

- [Front-end example using Vue.js](https://github.com/radixdlt/radixdlt-js-skeleton)
- [Express.js server example](https://github.com/radixdlt/radixdlt-js-server-example)

## Code examples

In our [Knowledge Base](https://docs.radixdlt.com) you can find implementation examples to execute basic tasks with our JavaScript library:

- [Initializing a Universe](https://docs.radixdlt.com/alpha/developer/javascript-client-library-guide/code-examples#initializing-a-universe)
- [Reading Atoms from a public address](https://docs.radixdlt.com/alpha/developer/javascript-client-library-guide/code-examples#reading-atoms-from-a-public-address)
- [Reading and decrypting Atoms from an owned address](https://docs.radixdlt.com/alpha/developer/javascript-client-library-guide/code-examples#reading-and-decrypting-atoms-from-an-owned-address)
- [Sending a Transaction](https://docs.radixdlt.com/alpha/developer/javascript-client-library-guide/code-examples#sending-a-transaction)
- [Sending a Message](https://docs.radixdlt.com/alpha/developer/javascript-client-library-guide/code-examples#sending-a-message)
- [Storing an application Payload](https://docs.radixdlt.com/alpha/developer/javascript-client-library-guide/code-examples#storing-an-application-payload)
- [Caching Atoms](https://docs.radixdlt.com/alpha/developer/javascript-client-library-guide/code-examples#caching-atoms)
- [Storing private Keys](https://docs.radixdlt.com/alpha/developer/javascript-client-library-guide/code-examples#storing-private-keys)
- [Loading private Keys](https://docs.radixdlt.com/alpha/developer/javascript-client-library-guide/code-examples#loading-private-keys)
- [Setting a log level](https://docs.radixdlt.com/alpha/developer/javascript-client-library-guide/code-examples#setting-a-log-level)

## Known issues

### Angular

Apparently on Angular 6+ versions, the node module polyfills from webpack are not bundled. To fix your issue with crypto, path, etc. go to `node_modules/@angular-devkit/build-angular/src/angular-cli-files/models/webpack-configs/browser.js` and do the following change:

```
node: { crypto: true, path: true }
```

> NOTE: This is not a reproducible fix. If you install your modules in a new location, you will lose this change.

## Contribute

Contributions are welcome, we simply ask to:

* Fork the codebase
* Make changes
* Submit a pull request for review

When contributing to this repository, we recommend to discuss the change you wish to make via issue,
email, or any other method with the owners of this repository before making a change. 

Please follow our [Code of Conduct](CODE_OF_CONDUCT.md) in all your interactions with the project.

## Links

| Link | Description |
| :----- | :------ |
[radixdlt.com](https://radixdlt.com/) | Radix DLT Homepage
[documentation](https://docs.radixdlt.com/) | Radix Knowledge Base
[forum](https://forum.radixdlt.com/) | Radix Technical Forum
[@radixdlt](https://twitter.com/radixdlt) | Follow Radix DLT on Twitter

## License

The radixdlt-js library is released under the [MIT License](LICENSE).
