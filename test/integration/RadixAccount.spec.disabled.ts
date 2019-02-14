import { Subject } from 'rxjs'
import { takeUntil, takeWhile } from 'rxjs/operators'
import { describe, before } from 'mocha'

import {
  radixUniverse,
  RadixUniverse,
  RadixAddress,
  RadixAccount,
  RadixSimpleIdentity,
  RadixTransactionBuilder,
  RadixLogger,
} from '../..'


before(() => {
  RadixLogger.setLevel('error')

  // Bootstrap the universe
  radixUniverse.bootstrap(RadixUniverse.LOCAL)
})

describe('RadixAccount', () => {

  it('should wait untill it\'s synced to read the messages', function (done) {
    this.timeout(10000)

    const fromIdentity = new RadixSimpleIdentity(RadixAddress.generateNew())
    const toIdentity = new RadixSimpleIdentity(RadixAddress.generateNew())

    const fromAccount = fromIdentity.account
    const toAccount = toIdentity.account

    for (let i = 0; i < 10; i++) {
      RadixTransactionBuilder
        .createRadixMessageAtom(fromAccount, toAccount, 'Foobar')
        .signAndSubmit(fromIdentity)
    }

    fromAccount.openNodeConnection()
      .then((value) => {
        fromAccount.isSynced()
          .pipe(takeWhile((x) => !x))
          .subscribe({
            error: error => done(error),
            complete: () => done(),
          })
      })
  })

})
