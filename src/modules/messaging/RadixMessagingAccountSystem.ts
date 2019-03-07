import { Subject, Observable, Observer } from 'rxjs'
import { TSMap } from 'typescript-map'

import RadixMessageUpdate from './RadixMessageUpdate'

import { RadixAccountSystem, RadixChat, RadixMessage, RadixSerializer } from '../..'
import { RadixAddress, RadixAtomUpdate, RadixAtom } from '../atommodel';
import { RadixDecryptedData, RadixDecryptionState } from '../account/RadixDecryptionAccountSystem';
import { logger } from '../common/RadixLogger';

export default class RadixMessagingAccountSystem implements RadixAccountSystem {
    public name = 'RADIX-MESSAGING'
    public messageSubject: Subject<RadixMessageUpdate> = new Subject()

    public chats: TSMap<string, RadixChat> = new TSMap()
    public messages: TSMap<string, RadixMessage> = new TSMap()

    constructor(readonly address: RadixAddress) {}

    public async processAtomUpdate(atomUpdate: RadixAtomUpdate) {
        if (!('decryptedData' in atomUpdate.processedData) || 
            atomUpdate.processedData.decryptedData.application !== 'message' ||
            atomUpdate.processedData.decryptedData.decryptionState === RadixDecryptionState.CANNOT_DECRYPT) {
            return
        }

        if (atomUpdate.action === 'STORE') {
            this.processStoreAtom(atomUpdate)
        } else if (atomUpdate.action === 'DELETE') {
            this.processDeleteAtom(atomUpdate)
        }
    }

    public startNewChat(to: RadixAddress) {
        // Create new chat
        const chatId = to.getAddress()

        if (this.chats.has(chatId)) { return }

        const chatDescription: RadixChat = {
            address: to.getAddress(),
            chat_id: chatId,
            title: chatId,
            last_message_timestamp: Date.now(),
            messages: new TSMap(),
        }

        // Add at the top
        this.chats.set(chatId, chatDescription)
    }

    private processStoreAtom(atomUpdate: RadixAtomUpdate) {
        const atom = atomUpdate.atom
        const hid = atom.hid.toString()
        const signatures = atom.signatures
        const decryptedData: RadixDecryptedData = atomUpdate.processedData.decryptedData

        // Skip existing atoms
        if (this.messages.has(hid)) {
            return
        }

        const from = decryptedData.from
        const to = decryptedData.to.find(a => !a.equals(from))

        // console.log(RadixSerializer.toJSON(decryptedData))

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

        const chatId = address.toString()

        const message: RadixMessage = {
            hid,
            chat_id: chatId,
            to,
            from,
            content: decryptedData.data,
            timestamp: atom.getTimestamp(),
            is_mine: isMine,
            encryptionState: decryptedData.decryptionState,
        }

        // Find existing chat
        // Otherwise create new chat
        if (!this.chats.has(chatId)) {
            const newChatDescription: RadixChat = {
                address: address.getAddress(),
                chat_id: chatId,
                title: chatId,
                last_message_timestamp: message.timestamp,
                messages: new TSMap(),
            }

            this.chats.set(chatId, newChatDescription)
        }

        const chatDescription = this.chats.get(chatId)
        if (message.timestamp > chatDescription.last_message_timestamp) {
            chatDescription.last_message_timestamp = message.timestamp
        }
        chatDescription.messages.set(hid, message)

        // Move chat to the top
        this.chats.delete(chatId)
        this.chats.set(chatId, chatDescription)

        this.messages.set(hid, message)

        const messageUpdate = {
            action: 'STORE',
            hid,
            message,
        }

        this.messageSubject.next(messageUpdate)        
    }

    private processDeleteAtom(atomUpdate: RadixAtomUpdate) {
        const atom = atomUpdate.atom

        const hid = atom.hid.toString()

        // Skip nonexisting atoms
        if (!this.messages.has(hid)) {
            return
        }

        const message = this.messages.get(hid)

        this.chats.get(message.chat_id).messages.delete(hid)

        this.messages.delete(hid)

        const messageUpdate = {
            action: 'DELETE',
            hid,
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
                        hid: message.hid,
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
