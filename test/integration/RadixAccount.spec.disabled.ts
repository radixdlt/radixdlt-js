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
