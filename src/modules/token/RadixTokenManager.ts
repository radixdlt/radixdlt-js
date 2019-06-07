import { RadixAccount } from '../..'
import { RadixAddress, RadixAtom, RRI } from '../atommodel'
import { Observable, BehaviorSubject, Subject } from 'rxjs'
import { TSMap } from 'typescript-map'
import { filter, timeout, catchError, take } from 'rxjs/operators';
import { RadixTokenDefinition } from './RadixTokenDefinition';

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

    public initialize(genesis: RadixAtom[], nativeToken: RRI) {
        this.nativeToken = nativeToken

        const systemAccount = new RadixAccount(nativeToken.address)

        for (const atom of genesis) {
            systemAccount._onAtomReceived({
                action: 'STORE',
                atom,
                processedData: {},
                isHead: false,
            })
        }

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

        account.tokenDefinitionSystem.getTokenDefinitionObservable(reference.getName()).subscribe(bs)

        this.tokenSubscriptions.set(referenceURI, bs)

        bs.subscribe(tokenDefinition => {
            this.tokens[referenceURI] = tokenDefinition
        })

        bs.subscribe(this.allTokenUpdateSubject)
    }

    public getTokenDefinition(referenceURI: string): Promise<RadixTokenDefinition> {
        this.checkInitialized()

        return new Promise((resolve, reject) => {

            const reference = RRI.fromString(referenceURI)
            this.getAccount(reference.getAddress()).then((account) => {
                account.isSynced().pipe(
                    filter(val => val === true),
                    take(1),
                    timeout(5000),
                ).subscribe(
                    null,
                    error => {reject(new Error('Timeout tying to fetch token information from network'))},
                    () => {
                        // Account is synced
                        const tokenDefinition = account.tokenDefinitionSystem.getTokenDefinition(reference.getName())
    
                        if (tokenDefinition) {
                            resolve(tokenDefinition)
                        } else {
                            reject(new Error('Token definition does not exist in the account'))
                        }
                    },
                )
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
