import {
    RadixAccount,
    RadixAddress,
    RadixAtomNodeStatusUpdate, RadixAtomObservation,
    RadixSignatureProvider,
    RadixSimpleIdentity,
    RadixTransactionBuilder,
    RRI
} from '../../index'
import { BehaviorSubject, Observable } from 'rxjs'
import { encryptedTextDecryptableBySenderAndRecipientMessageAction, unencryptedTextMessageAction } from '../messaging/SendMessageAction'
import PrivateKey from '../crypto/PrivateKey'
import { TokenBalance } from './TokenBalance'

export default class RadixApplicationClient {

    private readonly account: RadixAccount
    private readonly address: RadixAddress
    private readonly signer: RadixSignatureProvider
    private readonly transactionBuilder: RadixTransactionBuilder

    constructor(
        account: RadixAccount,
        signer: RadixSignatureProvider,
    ) {
        this.account = account
        this.address = account.address
        this.signer = signer
        this.transactionBuilder = new RadixTransactionBuilder(account)
    }

    public static withMagic(
        magicByte: number,
        privateKey: PrivateKey,
    ): RadixApplicationClient {
        const address = new RadixAddress(magicByte, privateKey.publicKey())
        const account = new RadixAccount(address)

        return new RadixApplicationClient(
            account,
            new RadixSimpleIdentity(privateKey),
        )
    }

    public submitEncryptedTextMessageReadableBySenderAndRecipient(
        to: RadixAddress,
        textToEncrypt: string,
    ): Observable<RadixAtomObservation> {

        return this.transactionBuilder.sendMessage(
            encryptedTextDecryptableBySenderAndRecipientMessageAction(
                this.address,
                to,
                textToEncrypt,
            ),
        ).signAndSubmit(
            this.signer,
        )
    }

    public submitPlainTextMessage(
        to: RadixAddress,
        textReadableByEveryone: string,
    ): Observable<RadixAtomObservation> {

        return this.transactionBuilder.sendMessage(
            unencryptedTextMessageAction(
                this.address,
                to,
                textReadableByEveryone,
            ),
        ).signAndSubmit(
            this.signer,
        )
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
}
