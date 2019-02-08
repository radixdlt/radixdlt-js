import { RadixAccount } from '../..'
import { RadixTokenClassParticle, RadixTokenClassReference, RadixAddress, RadixAtom } from '../atommodel'
import { Observable, BehaviorSubject, Subject } from 'rxjs'
import { TSMap } from 'typescript-map'
import { RadixTokenClass } from './RadixTokenClass'

/**
 * A singleton class for loading information about tokens
 */
export class RadixTokenManager {
    public tokens: { [id: string]: RadixTokenClass } = {}

    private tokenSubscriptions: TSMap<string, BehaviorSubject<RadixTokenClass>> = new TSMap()
    private accounts: TSMap<string, RadixAccount> = new TSMap()
    private allTokenUpdateSubject: Subject<RadixTokenClass> = new Subject()

    public powToken: RadixTokenClassReference
    public nativeToken: RadixTokenClassReference

    private initialized = false

    public initialize(genesis: RadixAtom[], powToken: RadixTokenClassReference, nativeToken: RadixTokenClassReference) {
        this.powToken = powToken
        this.nativeToken = nativeToken

        const account = new RadixAccount(powToken.address)

        for (const atom of genesis) {
            account._onAtomReceived({
                action: 'STORE',
                atom,
                processedData: {},
            })
        }

        this.accounts.set(account.getAddress(), account)

        this.addTokenClassSubscription(powToken.toString())
        this.addTokenClassSubscription(nativeToken.toString())

        this.initialized = true
    }

    public getTokenClassObservable(referenceURI: string): Observable<RadixTokenClass> {
        this.checkInitialized()

        if (!this.tokenSubscriptions.has(referenceURI)) {
            this.addTokenClassSubscription(referenceURI)
        }

        return this.tokenSubscriptions.get(referenceURI).share()
    }

    private addTokenClassSubscription(referenceURI: string) {
        const reference = RadixTokenClassReference.fromString(referenceURI)
        const account = this.getAccount(reference.address)

        const placeholderTokenClass = new RadixTokenClass(reference.address, reference.unique)

        const bs = new BehaviorSubject(placeholderTokenClass)

        account.tokenClassSystem.getTokenClassObservable(reference.unique).subscribe(bs)

        this.tokenSubscriptions.set(referenceURI, bs)

        bs.subscribe(tokenClass => {
            this.tokens[referenceURI] = tokenClass
        })

        bs.subscribe(this.allTokenUpdateSubject)
    }

    public getTokenClass(referenceURI: string): Promise<RadixTokenClass> {
        this.checkInitialized()

        return new Promise((resolve, reject) => {
            this.getTokenClassObservable(referenceURI).subscribe(
                tokenClassDescription => {
                    if (tokenClassDescription.name) {
                        resolve(tokenClassDescription)
                    }
                }
            )
        })
    }

    public getTokenClassNoLoad(referenceURI: string) {
        return this.tokens[referenceURI]
    }

    private getAccount(address: RadixAddress) {
        if (this.accounts.has(address.toString())) {
            return this.accounts.get(address.toString())
        } else {
            const account = new RadixAccount(address)
            account.openNodeConnection()
            this.accounts.set(address.toString(), account)
            return account
        }
    }

    private checkInitialized() {
        if (!this.initialized) {
            throw new Error('Token Manager not initialized')
        }
    }

    public getAllTokenClassUpdates() {
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
