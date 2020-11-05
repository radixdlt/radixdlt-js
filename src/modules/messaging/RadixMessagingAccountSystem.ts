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

import { Observable, Observer, Subject } from 'rxjs'
import { TSMap } from 'typescript-map'

import RadixMessageUpdate from './RadixMessageUpdate'

import { RadixAccountSystem, RadixAtomObservation, RadixAtomStatusIsInsert } from '../..'
import { RadixAddress } from '../atommodel'
import SendMessageAction from './SendMessageAction'
import { mapAtomToSendMessagesAction } from './AtomToSendMessageActionMapper'
import RadixDecryptionProvider from '../identity/RadixDecryptionProvider'

export default class RadixMessagingAccountSystem implements RadixAccountSystem {
    public name = 'RADIX-MESSAGING'
    public messageSubject: Subject<RadixMessageUpdate> = new Subject()

    public messages: TSMap<string, SendMessageAction[]> = new TSMap()
    public decryptionProvider: RadixDecryptionProvider

    public async processAtomUpdate(atomUpdate: RadixAtomObservation) {

        if (RadixAtomStatusIsInsert[atomUpdate.status.status]) {
            await this.processStoreAtom(atomUpdate)
        } else {
            this.processDeleteAtom(atomUpdate)
        }
    }

    private async processStoreAtom(atomUpdate: RadixAtomObservation) {
        const atom = atomUpdate.atom
        const aid = atom.getAidString()

        // Skip existing atoms
        if (this.messages.has(aid)) {
            return
        }

        const messages = await mapAtomToSendMessagesAction(
            atom,
            this.decryptionProvider,
        )

        this.messages.set(aid, messages)

        messages.forEach(sendMessageAction => {

            const messageUpdate = {
                action: 'STORE',
                aid,
                message: sendMessageAction,
            }

            this.messageSubject.next(messageUpdate)
        })

    }

    private processDeleteAtom(atomUpdate: RadixAtomObservation) {
        const atom = atomUpdate.atom

        const aid = atom.getAidString()

        // Skip nonexisting atoms
        if (!this.messages.has(aid)) {
            return
        }

        const messagesToDelete = this.messages.get(aid)

        this.messages.delete(aid)

        messagesToDelete.forEach(sendMessageAction => {

            const messageUpdate = {
                action: 'DELETE',
                aid,
                message: sendMessageAction,
            }

            this.messageSubject.next(messageUpdate)
        })
    }

    public getAllMessages(): Observable<RadixMessageUpdate> {
        return Observable.create(
            (observer: Observer<RadixMessageUpdate>) => {
                // Send all old transactions
                this.messages.forEach((sendMessageActions: SendMessageAction[], aid: string) => {
                    sendMessageActions.forEach(sendMessageAction => {
                        const messageUpdate: RadixMessageUpdate = {
                            action: 'STORE',
                            aid: aid,
                            message: sendMessageAction,
                        }

                        observer.next(messageUpdate)
                    })
                })

                // Subscribe for new ones
                this.messageSubject.subscribe(observer)
            },
        )
    }
}
