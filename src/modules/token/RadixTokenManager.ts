import { radixUniverse, RadixAccount } from '../..'
import { RadixTokenClassParticle, RadixTokenClassReference, RadixAddress } from '../atommodel';
import { Observable, BehaviorSubject } from 'rxjs';
import { TSMap } from 'typescript-map';


export interface RadixTokenDescription {
    loaded: boolean
}

/**
 * Tokens' information manager.
 */
export class RadixTokenManager {
    public tokens: { [id: string]: RadixTokenClassParticle } = {}

    private tokenSubscriptions: TSMap<string, BehaviorSubject<RadixTokenDescription>> = new TSMap()
    private accounts: TSMap<string, RadixAccount> = new TSMap()


    public initialize() {
        // for (const atom of radixUniverse.universeConfig.genesis) {
        //     if (atom.serializer === RadixTokenClass.SERIALIZER) {
        //         this.addOrUpdateToken(RadixSerializer.fromJson(atom))
        //     }
        // }
    }


    public getTokenClass(reference: RadixTokenClassReference) { // : Observable<RadixTokenClassParticle> {
        
        const id = reference.toString()

        if (!this.tokenSubscriptions.has(id)) {
            const account = this.getAccount(reference.address)

            //account.tokenClassSystem.
        }


        // if not exists
            // create account
            // subscribe for token updates
            // openConnection

        

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

    


    /**
     * Return a list of the current tokens in the manager.
     *
     * @returns
     * @memberof RadixToken
     */
    public getCurrentTokens() {
        return this.tokens
    }
}

export let radixTokenManager = new RadixTokenManager()
