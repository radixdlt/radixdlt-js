import {
    logger,
    RadixAccount,
    RadixAddress,
    RadixAtom,
    RadixAtomObservation,
    RadixNodeConnection,
    RadixSignatureProvider,
    RadixSimpleIdentity,
    RadixTransactionBuilder,
    RadixUniverse,
    RRI
} from '../../index'
import { Observable } from 'rxjs'
import { encryptedTextDecryptableBySenderAndRecipientMessageAction, unencryptedTextMessageAction } from '../messaging/SendMessageAction'
import PrivateKey from '../crypto/PrivateKey'
import { TokenBalance } from './TokenBalance'
import { RadixPartialBootstrapConfig } from '../universe/RadixBootstrapConfig'
import PublicKey from '../crypto/PublicKey'


export const makeAccountFromUniverseAndAddress = (universe: RadixUniverse, address: RadixAddress): RadixAccount => {
    const atomObservation = universe.ledger.getAtomObservations(address)

    const account = new RadixAccount(
        address,
        universe.nativeToken,
        atomObservation,
        universe.ledger.onSynced(atomObservation),
    )

    return account
}

export default class RadixApplicationClient {

    private readonly account: RadixAccount
    private readonly address: RadixAddress
    public readonly transactionBuilder: RadixTransactionBuilder
    private readonly universe: RadixUniverse

    private constructor(
        universe: RadixUniverse,
        account: RadixAccount,
        signer: RadixSignatureProvider,
    ) {
        this.universe = universe
        this.account = account
        this.address = account.address

        const getNodeConnectionFromUniverse = (): Promise<RadixNodeConnection> => {
            return universe.getNodeConnection()
        }

        if (!universe.ledger) {
            throw new Error(`☠️ Universe has no ledger, fix his error NOW!`)
        }
        if (!universe.ledger.atomStore) {
            throw new Error(`☠️ Universe.ledger has no atomStore, fix his error NOW!`)
        }

        const storeAtomLocallyThenSubmit = (atom: RadixAtom, node: RadixNodeConnection): Observable<RadixAtom> => {
            return universe.ledger.submitAtom(atom, node)
        }

        this.transactionBuilder = new RadixTransactionBuilder(
            account,
            signer,
            universe.getMagic(),
            storeAtomLocallyThenSubmit,
            getNodeConnectionFromUniverse,
        )
    }

    public static withUniverse(
        universe: RadixUniverse,
        privateKey: PrivateKey,
    ): RadixApplicationClient {

        const address = new RadixAddress(
            universe.getMagicByte(),
            privateKey.publicKey(),
        )

        const account = makeAccountFromUniverseAndAddress(universe, address)

        return new RadixApplicationClient(
            universe,
            account,
            new RadixSimpleIdentity(privateKey),
        )
    }

    public static async createByBootstrapingTrustedNode(
        bootstrapConfig: RadixPartialBootstrapConfig = RadixUniverse.LOCAL_SINGLE_NODE,
        awaitNodeConnection: boolean = true,
        backingUpPrivateKey?: (newPrivateKey: PrivateKey) => void,
    ): Promise<RadixApplicationClient> {

        const universe = await RadixUniverse.createByBootstrapingTrustedNode(
            bootstrapConfig,
            awaitNodeConnection,
        )

        const newPrivateKey = PrivateKey.generateNew()

        if (backingUpPrivateKey) {
            backingUpPrivateKey(newPrivateKey)
        }

        return RadixApplicationClient.withUniverse(universe, newPrivateKey)
    }

    public submitEncryptedTextMessageReadableBySenderAndRecipient(
        to: RadixAddress,
        textToEncrypt: string,
    ): Observable<RadixAtom> {

        return this.transactionBuilder.sendMessage(
            encryptedTextDecryptableBySenderAndRecipientMessageAction(
                this.address,
                to,
                textToEncrypt,
            ),
        ).signAndSubmit()
    }

    public submitPlainTextMessage(
        to: RadixAddress,
        textReadableByEveryone: string,
    ): Observable<RadixAtom> {

        return this.transactionBuilder.sendMessage(
            unencryptedTextMessageAction(
                this.address,
                to,
                textReadableByEveryone,
            ),
        ).signAndSubmit()
    }
    //
    // public putUnique(unique: string): Observable<RadixAtomObservation> {
    //     return this.transactionBuilder.addUniqueParticle(unique)
    //         .signAndSubmit()
    // }


    public observePutUnique(unique: string): Observable<RadixAtom> {
        return this.transactionBuilder.addUniqueParticle(unique)
            .signAndSubmit()
    }

    public async putUnique(unique: string): Promise<RadixAtom> {
        return this.observePutUnique(unique)
            .toPromise()
    }

    public observeTokenBalance(
        of: RadixAddress,
        token: RRI,
    ): Observable<TokenBalance> {
        return this.account.transferSystem
            .getTokenUnitsBalanceUpdates()
            .map(balancesPerToken => {
                const amount = balancesPerToken[token.toString()]
                return {
                    token,
                    owner: this.account.address,
                    amount,
                }
            })
    }

    public observeMyBalance(
        of: RRI,
    ): Observable<TokenBalance> {
        const tokenRRI = of
        return this.observeTokenBalance(
            this.account.address,
            tokenRRI,
        )
    }

    public addressWithPublicKey(publicKey: PublicKey): RadixAddress {
        return new RadixAddress(this.universe.getMagicByte(), publicKey)
    }
}
