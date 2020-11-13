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

import { RadixAccount, logger } from '../..'
import { RadixAddress, RadixAtom, RRI } from '../atommodel'
import { Observable, BehaviorSubject, Subject, Subscription } from 'rxjs'
import { TSMap } from 'typescript-map'
import { filter, timeout, catchError, take, tap } from 'rxjs/operators'
import { RadixTokenDefinition } from './RadixTokenDefinition'

/**
 * A singleton class for loading information about tokens
 */
export class RadixTokenManager {
    public tokens: { [id: string]: RadixTokenDefinition } = {}

    private tokenSubscriptions: TSMap<string, BehaviorSubject<RadixTokenDefinition>> = new TSMap()
    public accounts: TSMap<string, RadixAccount> = new TSMap()
    private allTokenUpdateSubject: Subject<RadixTokenDefinition> = new Subject()

    public nativeToken: RRI

    private initialized = false

    private subs = new Subscription()

    public initialize(nativeToken: RRI) {
        this.accounts = new TSMap()
        this.tokenSubscriptions.forEach(subject => {
            subject.unsubscribe()
        })
        this.tokenSubscriptions = new TSMap()
        this.tokens = {}
        this.allTokenUpdateSubject.unsubscribe()
        this.allTokenUpdateSubject = new Subject()

        this.nativeToken = nativeToken
        const systemAccount = new RadixAccount(nativeToken.address)
        this.accounts.set(systemAccount.getAddress(), systemAccount)
        this.addTokenDefinitionSubscription(nativeToken.toString())
        this.initialized = true
    }

    public async getTokenDefinitionObservable(referenceURI: string): Promise<Observable<RadixTokenDefinition>> {
        this.checkInitialized()

        if (!this.tokenSubscriptions.has(referenceURI)) {
            await this.addTokenDefinitionSubscription(referenceURI)
        }

        return this.tokenSubscriptions.get(referenceURI).share()
    }

    private async addTokenDefinitionSubscription(referenceURI: string) {
        const reference = RRI.fromString(referenceURI)
        const account = await this.getAccount(reference.getAddress())

        const placeholderTokenDefinition = new RadixTokenDefinition(reference.getAddress(), reference.getName())

        const bs = new BehaviorSubject(placeholderTokenDefinition)

        this.subs.add(account.tokenDefinitionSystem.getTokenDefinitionObservable(reference.getName()).subscribe(bs))

        this.tokenSubscriptions.set(referenceURI, bs)

        this.subs.add(bs.subscribe(tokenDefinition => {
            this.tokens[referenceURI] = tokenDefinition
        }))

        this.subs.add(bs.subscribe(this.allTokenUpdateSubject))
    }

    public getTokenDefinition(referenceURI: string): Promise<RadixTokenDefinition> {
        this.checkInitialized()

        return new Promise((resolve, reject) => {

            const reference = RRI.fromString(referenceURI)
            this.getAccount(reference.getAddress()).then((account) => {

                this.subs.add(account.isSynced().pipe(
                    filter(val => val === true),
                    take(1),
                    timeout(5000),
                ).subscribe(
                    null,
                    error => {
                        logger.error(error)
                        reject(new Error('Timeout tying to fetch token information from network'))
                    },
                    () => {
                        // Account is synced
                        const tokenDefinition = account.tokenDefinitionSystem.getTokenDefinition(reference.getName())

                        if (tokenDefinition) {
                            resolve(tokenDefinition)
                        } else {
                            reject(new Error('Token definition does not exist in the account'))
                        }
                    },
                ))
            })
        })
    }

    public getTokenDefinitionNoLoad(referenceURI: string) {
        return this.tokens[referenceURI]
    }

    private async getAccount(address: RadixAddress) {
        if (this.accounts.has(address.toString())) {
            return this.accounts.get(address.toString())
        } else {
            const account = new RadixAccount(address)
            this.accounts.set(address.toString(), account)
            return account
        }
    }

    private checkInitialized() {
        if (!this.initialized) {
            throw new Error('Token Manager not initialized')
        }
    }

    public getAllTokenDefinitionUpdates() {
        return this.allTokenUpdateSubject.share()
    }

    /**
     * Return a list of the current tokens in the manager.
     *
     * @returns
     * @memberof RadixToken
     */
    public getCurrentTokens() {
        this.checkInitialized()

        return this.tokens
    }
}

export let radixTokenManager = new RadixTokenManager()
