import { Subject, Observable, Observer } from 'rxjs'
import { TSMap } from 'typescript-map'

import RadixMessageUpdate from './RadixMessageUpdate'

import { RadixAccountSystem, RadixChat, RadixMessage } from '../..'
import { RadixApplicationPayloadAtom, RadixAtom, RadixKeyPair, RadixAtomUpdate } from '../RadixAtomModel'

export default class RadixMessagingAccountSystem implements RadixAccountSystem {
    public name = 'RADIX-MESSAGING'
    public messageSubject: Subject<RadixMessageUpdate> = new Subject()

    public chats: TSMap<string, RadixChat> = new TSMap()
    public messages: TSMap<string, RadixMessage> = new TSMap()

    constructor(readonly keyPair) {}

    public async processAtomUpdate(atomUpdate: RadixAtomUpdate) {
        const atom = atomUpdate.atom

        if (atom.serializer !== RadixApplicationPayloadAtom.SERIALIZER || (atom as RadixApplicationPayloadAtom).applicationId !== 'radix-messaging') {
            return
        }

        if (atomUpdate.action === 'STORE') {
            this.processStoreAtom(atom as RadixApplicationPayloadAtom)
        } else if (atomUpdate.action === 'DELETE') {
            this.processDeleteAtom(atom as RadixApplicationPayloadAtom)
        }
    }

    public startNewChat(to: RadixKeyPair) {
        // Create new chat
        const chatId = to.getAddress()

        if (this.chats.has(chatId)) { return }

        const chatDescription: RadixChat = {
            address: to.getAddress(),
            chat_id: chatId,
            title: chatId,
            last_message_timestamp: Date.now(),
            messages: new TSMap()
        }

        // Add at the top
        this.chats.set(chatId, chatDescription)
    }

    private processStoreAtom(atom: RadixApplicationPayloadAtom) {
        const hid = atom.hid.toString()

        // Skip existing atoms
        if (this.messages.has(hid)) {
            return
        }

        if (atom.payload === null) {
            return
        }

        // Format message
        const payload = JSON.parse(atom.payload)

        // TODO: check owner

        const to = RadixKeyPair.fromAddress(payload.to)
        const from = RadixKeyPair.fromAddress(payload.from)

        // Chat id
        let address = null
        let isMine = false

        if (from.equals(this.keyPair)) {
            address = to
            isMine = true
        } else if (to.equals(this.keyPair)) {
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
            content: payload.content,
            timestamp: atom.timestamps.default,
            is_mine: isMine,
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

    private processDeleteAtom(atom: RadixApplicationPayloadAtom) {
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
                        message: message
                    }

                    observer.next(messageUpdate)
                }

                // Subscribe for new ones
                this.messageSubject.subscribe(observer)
            },
        )
    }
}
