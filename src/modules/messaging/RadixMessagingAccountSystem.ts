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

import { Subject, Observable, Observer } from 'rxjs'
import { TSMap } from 'typescript-map'

import RadixMessageUpdate from './RadixMessageUpdate'

import { RadixAccountSystem, RadixChat, RadixMessage, RadixSerializer, RadixAtomStatusIsInsert, RadixAtomObservation } from '../..'
import { RadixAddress, RadixAtomUpdate, RadixAtom } from '../atommodel';
import { RadixDecryptedData, RadixDecryptionState } from '../account/RadixDecryptionAccountSystem';
import { logger } from '../common/RadixLogger';



export default class RadixMessagingAccountSystem implements RadixAccountSystem {
    public name = 'RADIX-MESSAGING'
    public messageSubject: Subject<RadixMessageUpdate> = new Subject()

    public messages: TSMap<string, RadixMessage> = new TSMap()

    constructor(readonly address: RadixAddress) {}

    public async processAtomUpdate(atomUpdate: RadixAtomObservation) {
        // if (
        //     atomUpdate.processedData.decryptedData.application !== 'message' ||
        //     atomUpdate.processedData.decryptedData.decryptionState === RadixDecryptionState.CANNOT_DECRYPT) {
        //     return
        // }

        if (RadixAtomStatusIsInsert[atomUpdate.status.status]) {
            this.processStoreAtom(atomUpdate)
        } else {
            this.processDeleteAtom(atomUpdate)
        }
    }

    private processStoreAtom(atomUpdate: RadixAtomObservation) {
        const atom = atomUpdate.atom
        const aid = atom.getAidString()
        // const decryptedData: RadixDecryptedData = atomUpdate.processedData.decryptedData



        // Skip existing atoms
        if (this.messages.has(aid)) {
            return
        }

        const from = decryptedData.from
        const to = decryptedData.to.find(a => !a.equals(from))

        if (!to) {
            throw new Error('A message needs to have at least one other recipient')
        }

        // Chat id
        let address = null
        let isMine = false

        if (from.equals(this.address)) {
            address = to
            isMine = true
        } else {
            address = from
        }

        if (address === null) {
            throw new Error('Error processing a radix-message atom: neither of addresses is owned by this account')
        }


        const message: RadixMessage = {
            aid,
            to,
            from,
            content: decryptedData.data,
            timestamp: 0, // TIMESTAMP TODO
            is_mine: isMine,
            encryptionState: decryptedData.decryptionState,
        }


        this.messages.set(aid, message)

        const messageUpdate = {
            action: 'STORE',
            aid,
            message,
        }

        this.messageSubject.next(messageUpdate)        
    }

    private processDeleteAtom(atomUpdate: RadixAtomObservation) {
        const atom = atomUpdate.atom

        const aid = atom.getAidString()

        // Skip nonexisting atoms
        if (!this.messages.has(aid)) {
            return
        }

        const message = this.messages.get(aid)

        this.messages.delete(aid)

        const messageUpdate = {
            action: 'DELETE',
            aid,
            message,
        }

        this.messageSubject.next(messageUpdate)   
    }


    public getAllMessages(): Observable<RadixMessageUpdate> {
        return Observable.create(
            (observer: Observer<RadixMessageUpdate>) => {
                // Send all old transactions
                for (const message of this.messages.values()) {
                    const messageUpdate: RadixMessageUpdate = {
                        action: 'STORE',
                        aid: message.aid,
                        message,
                    }

                    observer.next(messageUpdate)
                }

                // Subscribe for new ones
                this.messageSubject.subscribe(observer)
            },
        )
    }
}
