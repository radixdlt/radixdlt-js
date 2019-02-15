import { RadixAccount } from '../..'
import { RadixTokenClassParticle, RadixTokenClassReference, RadixAddress, RadixAtom } from '../atommodel'
import { Observable, BehaviorSubject, Subject } from 'rxjs'
import { TSMap } from 'typescript-map'
import { RadixTokenClass } from './RadixTokenClass'
import { filter, timeout, catchError, take } from 'rxjs/operators';

/**
 * A singleton class for loading information about tokens
 */
export class RadixTokenManager {
    public tokens: { [id: string]: RadixTokenClass } = {}

    private tokenSubscriptions: TSMap<string, BehaviorSubject<RadixTokenClass>> = new TSMap()
    public accounts: TSMap<string, RadixAccount> = new TSMap()
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
                isHead: false,
            })
        }


        this.accounts.set(account.getAddress(), account)

        this.addTokenClassSubscription(powToken.toString())
        this.addTokenClassSubscription(nativeToken.toString())

        this.initialized = true
    }

    public async getTokenClassObservable(referenceURI: string): Promise<Observable<RadixTokenClass>> {
        this.checkInitialized()

        if (!this.tokenSubscriptions.has(referenceURI)) {
            await this.addTokenClassSubscription(referenceURI)
        }

        return this.tokenSubscriptions.get(referenceURI).share()
    }

    private async addTokenClassSubscription(referenceURI: string) {
        const reference = RadixTokenClassReference.fromString(referenceURI)
        const account = await this.getAccount(reference.address)

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

            const reference = RadixTokenClassReference.fromString(referenceURI)
            this.getAccount(reference.address).then((account) => {
                account.isSynced().pipe(
                    filter(val => val === true),
                    take(1),
                    timeout(5000),
                ).subscribe(
                    null,
                    error => {reject(new Error('Timeout tying to fetch token information from network'))},
                    () => {
                        // Account is synced
                        const tokenClass = account.tokenClassSystem.getTokenClass(reference.symbol)
    
                        if (tokenClass) {
                            resolve(tokenClass)
                        } else {
                            reject(new Error('Token class does not exist in the account'))
                        }
                    },
                )
            })
        })
    }

    public getTokenClassNoLoad(referenceURI: string) {
        return this.tokens[referenceURI]
    }

    private async getAccount(address: RadixAddress) {
        if (this.accounts.has(address.toString())) {
            return this.accounts.get(address.toString())
        } else {
            const account = new RadixAccount(address)
            await account.openNodeConnection()
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
