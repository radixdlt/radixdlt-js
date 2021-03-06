/*
 * (C) Copyright 2020 Radix DLT Ltd
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the “Software”),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

import { BehaviorSubject, combineLatest, Observable, Subscription } from 'rxjs'

import { TSMap } from 'typescript-map'

import {
    linearBackingOffRetry,
    logger,
    RadixAccountSystem,
    RadixAtomObservation,
    RadixDataAccountSystem,
    RadixDecryptionAccountSystem,
    RadixDecryptionProvider,
    radixHash,
    RadixMessagingAccountSystem,
    RadixTokenDefinitionAccountSystem,
    RadixTransaction,
    RadixTransferAccountSystem,
    radixUniverse,
    sleep
} from '../..'


import { RadixAddress } from '../atommodel'
import axios from 'axios'
import { map, catchError } from 'rxjs/operators'
import RadixTransactionUpdate from './RadixTransactionUpdate'
import { filter } from 'rxjs/operators'


const sleepAmountIncrease = 1000

export default class RadixAccount {
    private accountSystems: TSMap<string, RadixAccountSystem> = new TSMap()

    public decryptionSystem: RadixDecryptionAccountSystem
    public transferSystem: RadixTransferAccountSystem
    public dataSystem: RadixDataAccountSystem
    public messagingSystem: RadixMessagingAccountSystem
    public tokenDefinitionSystem: RadixTokenDefinitionAccountSystem

    private processingAtomCounter = new BehaviorSubject(0)

    private atomObservable: Observable<RadixAtomObservation>

    private subs = new Subscription()

    private sleepAmount = sleepAmountIncrease


    public unsubscribeSubscribers() {
        this.subs.unsubscribe()

        if (this.decryptionSystem) {
            this.decryptionSystem.unsubscribeSubscribers()
        }

        if (this.tokenDefinitionSystem) {
            this.tokenDefinitionSystem.unsubscribeSubscribers()
        }

        if (this.transferSystem) {
            this.transferSystem.unsubscribeSubscribers()
        }

        if (this.dataSystem) {
            this.dataSystem.unsubscribeSubscribers()
        }

        if (this.messagingSystem) {
            this.messagingSystem.unsubscribeSubscribers()
        }
    }

    /**
     * An Account represents all the data stored in an address on the ledger.
     * The account object also holds account systems, which process the data on the ledger into application level state
     * @param address Address of the account
     * @param [plain] If set to true, will not create default account systems.
     * Use this for accounts that will not be connected to the network
     */
    constructor(readonly address: RadixAddress, plain = false) {
        if (!plain) {
            this.decryptionSystem = new RadixDecryptionAccountSystem()
            this.addAccountSystem(this.decryptionSystem)

            this.tokenDefinitionSystem = new RadixTokenDefinitionAccountSystem(address)
            this.addAccountSystem(this.tokenDefinitionSystem)

            this.transferSystem = new RadixTransferAccountSystem(address)
            this.addAccountSystem(this.transferSystem)

            this.dataSystem = new RadixDataAccountSystem(address)
            this.addAccountSystem(this.dataSystem)

            this.messagingSystem = new RadixMessagingAccountSystem(address)
            this.addAccountSystem(this.messagingSystem)
        }

        this.atomObservable = radixUniverse.ledger.getAtomObservations(address)

        this.subs.add(this.atomObservable.subscribe({
            next: this._onAtomReceived,
        }))
    }

    /**
     * An Account represents all the data stored in an address on the ledger.
     * The account object also holds account systems, which process the data on the ledger into application level state
     * @param address string address
     * @param [plain] If set to false, will not create default account systems.
     * Use this for accounts that will not be connected to the network
     * @returns
     */
    public static fromAddress(address: string, plain = false) {
        return new RadixAccount(RadixAddress.fromAddress(address), plain)
    }

    /**
     * Create an instance of a Radix account from an arbitrary byte buffer. This
     * could e.g. be a friendly name of an account, in which case it would be
     * created as <code>Buffer.from('friendly name')</code>.
     *
     * @param seed Buffer seed for the address
     * @param [plain] If set to true, will not create default account systems.
     * Use this for accounts that will not be connected to the network.
     * @returns a new Radix account.
     */
    public static fromSeed(seed: Buffer, plain = false) {
        const hash = radixHash(seed)
        return new RadixAccount(RadixAddress.fromPrivate(hash), plain)
    }

    /**
     * Enable the account to decrypt ECIES encrypted data by providing it with a DecryptionProvider
     * @param decryptionProvider Any type of identity which is capable of derypting ECIES enrypted data
     */
    public enableDecryption(decryptionProvider: RadixDecryptionProvider) {
        this.decryptionSystem.decryptionProvider = decryptionProvider
    }

    /**
     * Get the address of this account
     */
    public getAddress() {
        return this.address.getAddress()
    }

    /**
     * Add a new account system to the account. The system will be fed all new atom observations
     * @param system A RadixAccountSystem which knows how to proccess atom observations into state
     */
    public addAccountSystem(system: RadixAccountSystem) {
        if (this.accountSystems.has(system.name)) {
            throw new Error(
                `System "${system.name}" already exists in account, you can only have one of each system per account`,
            )
        }

        this.accountSystems.set(system.name, system)

        return system
    }

    /**
     * Remove an account system by its name
     * @param name The name of the account system
     */
    public removeAccountSystem(name: string) {
        if (this.accountSystems.has(name)) {
            this.accountSystems.delete(name)
        }
    }

    /**
     * Get an account system by its name
     * @param name The name of the account system
     */
    public getSystem(name: string) {
        if (this.accountSystems.has(name)) {
            return this.accountSystems.get(name)
        }

        throw new Error(`System "${name}" doesn't exist in account`)
    }

    /**
     * An observable that tells you when the account is in sync with the network
     *
     * @returns An observable which sends 'true' whenever the account has received and processed new information form the network
     */
    public isSynced(): Observable<boolean> {
        return combineLatest([
            radixUniverse.ledger.onSynced(this.atomObservable),
            this.processingAtomCounter.pipe(map((value) => value === 0))
        ]).pipe(
            map(isSynced => isSynced[0] && isSynced[1])
        )
    }

    private _onAtomReceived = async (atomObservation: RadixAtomObservation) => {


        if (!this.processingAtomCounter.closed && !this.processingAtomCounter.isStopped) {
            this.processingAtomCounter.next(this.processingAtomCounter.getValue() + 1)
        } else {
            logger.error(`☢️ processingAtomCounter closed or stopped`)
        }

        atomObservation.processedData = {}
        for (const system of this.accountSystems.values()) {
            await system.processAtomUpdate(atomObservation)
        }

        if (!this.processingAtomCounter.closed && !this.processingAtomCounter.isStopped) {
            this.processingAtomCounter.next(this.processingAtomCounter.getValue() - 1)
        } else {
            logger.error(`☢️ processingAtomCounter closed or stopped`)
        }

    }

    public async requestTestTokensFromFaucetWithLinearBackingOffRetry(
        url: string,
        maxNumberOfRetries: number = 10
    ): Promise<string> {
        return linearBackingOffRetry(getTokensFromFaucetURL.bind(null, this.address, url), maxNumberOfRetries)
    }
}

const getTokensFromFaucetURL = async (radixAddress: RadixAddress, url: string): Promise<string> => {
    const faucetURL = `${url}/api/v1/getTokens/${radixAddress.toString()}`

    let errorMsg = `Failed to get tokens from faucet`

    let response
    try {
        response = await axios.get(faucetURL)
    } catch (e) {
        throw new Error(errorMsg)
    }

    if (response.data) {
        const txString = response.data
        if (typeof txString === 'string' && txString.length > 0) {
            return txString
        }
    }

    throw new Error(errorMsg)
}
