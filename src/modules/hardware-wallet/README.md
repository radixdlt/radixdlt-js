# Hardware-wallet

This package implements communication to a hardware wallet device, and an interface for sending messages to the Radix Ledger App.

Refer to the Radix APDU spec for detailed information on message formats:

https://github.com/radixdlt/radixdlt-ledger-app/blob/master/APDUSPEC.md


| Version | Device Support | 
|---------|----------------|
| 1.0.0   | Ledger Nano S  |


## Install

`yarn add @radixdlt/hardware-wallet`

NOTE: If you get any errors related to the node-hid package, please check installation instructions here: https://github.com/node-hid/node-hid#compiling-from-source. On Linux you may need to run sudo apt install libusb-1.0-0 libusb-1.0-0-dev, for example.


## Usage

Initializing Radix identity:

    import { RadixHardwareWalletIdentity } from 'radixdlt'
    import { app } from '@radixdlt/hardware-wallet'

    const BIP44_PATH = '80000002' + '00000001' + '00000003' // Will use 44'/536'/2'/1/3

    const identity = await RadixHardwareWalletIdentity.createNew(app, BIP44_PATH)


Subscribing to events:

    import { subscribeAppConnection, subscribeDeviceConnection, AppState } from '@radixdlt/hardware-wallet'

    let deviceConnected: boolean = false
    let appState: AppState

    await subscribeDeviceConnection(isConnected => {
        deviceConnected = isConnected
    })

    subscribeAppConnection(state => {
        appState = state
    })



## API

### app.getPublicKey

    app.getPublicKey(bip44: string, p1: 0 | 1 = 0): Promise<{ publicKey: Buffer }>

Gets the public key from the hardware wallet, using the keypath defined by `bip44`.


##### Parameters

`bip44: string` - The last 3 parameters of a BIP44 derivation path (the first two are hard coded as 44'/536'). It expects a string representing the bit values, 1 byte per parameter. Example: "800000020000000100000003" (44'/536'/2'/1/3).

`p1: 0 | 1` - 0 = No confirmation of BIP32 path needed. 1 = Confirmation of BIP 32 path needed before generation of pub key.


##### Returns

`Promise<{ publicKey: Buffer }>` - A promise that resolves to an object with the public key. The public key is a byte array (NodeJS Buffer).


### app.getVersion

    app.getVersion(): Promise<string>

Gets the Radix Ledger App version.

##### Returns

`Promise<string>` - Resolves to a string for the app version, in semver form "<major>.<minor>.<patch>".


### app.signAtom

    app.signAtom(bip44: string, atom: RadixAtom, address: RadixAddress): Promise<RadixAtom>

Signs a Radix atom, using the account with the bip44 keypath.

##### Parameters

`bip44: string` - See above.

`atom: RadixAtom` - Radix atom object to be signed.

##### Returns

`Promise<RadixAtom>` - The atom with the included signature.


### app.signHash

    app.signHash(bip44: string, hash: Buffer): Promise<{ signature: Buffer }>

Signs a hash of an atom.

##### Parameters

`bip44: string` - See above.

`hash: Buffer` - Byte array of hash to be signed.

##### Returns

`Promise<{ signature: Buffer }` - The resulting signature.


### subscribeDeviceConnection

    subscribeDeviceConnection(next: (isConnected: boolean) => any)
   
Subscribes to events firing when the hardware device is connected/disconnected.
This happens when the device is unlocked/locked with a PIN code.

##### Parameters

`next: (isConnected: boolean) => void)` - A callback function, called with either true or false when the device connects/disconnects.


### subscribeAppConnection

    subscribeAppConnection(next: (status: AppState) => void)
    
Subscribes to status events from the Radix Ledger App.

Can be:

- APP_OPEN
- APP_CLOSED
- SIGN_CONFIRM
- SIGN_REJECT

##### Parameters

`next: (status: AppState) => void)` - A callback function, called with an app state change.
