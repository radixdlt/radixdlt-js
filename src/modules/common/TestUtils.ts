import { logger } from './RadixLogger'
import RadixAccount from '../account/RadixAccount'
import { RadixTransaction } from '../../index'
import { catchError, map } from 'rxjs/operators'
import RadixTransactionUpdate from '../account/RadixTransactionUpdate'

export const requestTestTokensFromFaucetOrDie = async (account: RadixAccount, killNodeServerOnFailure: boolean = true): Promise<string | void> => {
    return account.requestTestTokensFromFaucetWithLinearBackingOffRetry('localhost:8079')
    .catch(e => {
        if (killNodeServerOnFailure) {
            logger.error(`☠️🚨 killing process since we failed to get response from faucet`)
            process.exit(1)
        } else {
            const errorMessage = `Failed to get tokens from faucet`
            logger.error(errorMessage)
            throw new Error(errorMessage)
        }
    })

}

export const requestTestTokensFromFaucetAndUpdateBalanceOrDie = async (account: RadixAccount): Promise<RadixTransaction> => {

    const txUnique = await requestTestTokensFromFaucetOrDie(account)

    return account.transferSystem.getAllTransactions()
        .delay(2_000)
        .take(1)
        .timeout(60_000)
        .pipe(catchError((error, obs) => {
            throw new Error(`🚰 Failed to update balance after having received test XRD tokens from
                              faucet in tx with unique string
                               ${txUnique}, error: ${error}
                               `)
        }))
        .pipe(map((tu: RadixTransactionUpdate) => tu.transaction))
        .toPromise()
}
