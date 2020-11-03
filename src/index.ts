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

export * from './modules/atommodel'
export * from './modules/common/RadixUtil'

import RadixChat from './modules/messaging/RadixChat'
import RadixTransaction from './modules/account/RadixTransaction'
import RadixMessage from './modules/messaging/RadixMessage'
import RadixKeyStore from './modules/crypto/RadixKeyStore'


import RadixNodeConnection, { AtomReceivedNotification } from './modules/universe/RadixNodeConnection'
import RadixNodeDiscovery from './modules/universe/RadixNodeDiscovery'
import RadixNodeDiscoveryFromNodeFinder from './modules/universe/RadixNodeDiscoveryFromNodeFinder'
import RadixNodeDiscoveryHardcoded from './modules/universe/RadixNodeDiscoveryHardcoded'

import RadixUniverse, { radixUniverse } from './modules/universe/RadixUniverse'

import RadixIdentityManager from './modules/identity/RadixIdentityManager'
import RadixIdentity from './modules/identity/RadixIdentity'
import RadixSimpleIdentity from './modules/identity/RadixSimpleIdentity'
import RadixRemoteIdentity from './modules/identity/RadixRemoteIdentity'
import RadixAccount from './modules/account/RadixAccount'
import RadixAccountSystem from './modules/account/RadixAccountSystem'
import RadixTransferAccountSystem from './modules/account/RadixTransferAccountSystem'
import RadixTransactionUpdate from './modules/account/RadixTransactionUpdate'
import RadixTransactionBuilder from './modules/txbuilder/RadixTransactionBuilder'
import RadixMessagingAccountSystem from './modules/messaging/RadixMessagingAccountSystem'
import RadixMessageUpdate from './modules/messaging/RadixMessageUpdate'
import RadixApplicationData from './modules/account/RadixApplicationData'
import RadixApplicationDataUpdate from './modules/account/RadixApplicationDataUpdate'
import RadixLogger, { logger } from './modules/common/RadixLogger'
import RadixECIES from './modules/crypto/RadixECIES'
import RadixFeeProvider from './modules/fees/RadixFeeProvider'
import RadixDecryptionProvider from './modules/identity/RadixDecryptionProvider'
import RadixSignatureProvider from './modules/identity/RadixSignatureProvider'
import RadixPOW from './modules/pow/RadixPOW'
import RadixPOWTask from './modules/pow/RadixPOWTask'

import { radixTokenManager, RadixTokenManager } from './modules/token/RadixTokenManager'
import { RadixDecryptionAccountSystem } from './modules/account/RadixDecryptionAccountSystem'
import RadixNode from './modules/universe/RadixNode'
import { RadixBootstrapConfig } from './modules/universe/RadixBootstrapConfig';
import { RadixTokenDefinitionAccountSystem } from './modules/account/RadixTokenDefinitionAccountSystem'
import { RadixTokenDefinition } from './modules/token/RadixTokenDefinition'
import RadixNodeSystem from './modules/universe/RadixNodeSystem'
import RadixPeer from './modules/universe/RadixPeer'
import { RadixLedger } from './modules/ledger/RadixLedger'
import { RadixAtomStore } from './modules/ledger/RadixAtomStore'
import { RadixAtomNodeStatus } from './modules/universe/RadixAtomNodeStatus'
import { RadixAtomNodeStatusUpdate } from './modules/universe/RadixAtomNodeStatusUpdate'
import { RadixAtomObservation } from './modules/ledger/RadixAtomObservation'
import { RadixAtomStatusIsInsert } from './modules/universe/RadixAtomNodeStatusIsInsert'
import { RadixNEDBAtomStore } from './modules/ledger/RadixNEDBAtomStore'
import RadixHardwareWalletIdentity from './modules/identity/RadixHardwareWalletIdentity'

export {
    // Universe
    RadixNode,
    RadixNodeSystem,
    RadixPeer,
    RadixNodeConnection,
    AtomReceivedNotification,
    RadixNodeDiscovery,
    RadixNodeDiscoveryFromNodeFinder,
    RadixNodeDiscoveryHardcoded,
    RadixUniverse,
    radixUniverse,
    RadixAtomNodeStatus,
    RadixAtomNodeStatusUpdate,
    RadixAtomStatusIsInsert,
    RadixBootstrapConfig,

    // Account
    RadixAccount,
    RadixAccountSystem,
    RadixApplicationData,
    RadixApplicationDataUpdate,
    RadixDecryptionAccountSystem,
    RadixTransaction,
    RadixTransactionUpdate,
    RadixTransferAccountSystem,
    RadixTokenDefinitionAccountSystem,
    RadixTokenDefinition,
    
    // Common
    RadixLogger,
    logger,

    // Crypto
    RadixECIES,
    RadixKeyStore,

    // Fees
    RadixFeeProvider,

    // Identity
    RadixDecryptionProvider,
    RadixIdentity,
    RadixIdentityManager,
    RadixSignatureProvider,
    RadixSimpleIdentity,
    RadixRemoteIdentity,
    RadixHardwareWalletIdentity,
    // Ledger
    RadixLedger,
    RadixAtomStore,
    RadixAtomObservation,
    RadixNEDBAtomStore,

    // Messaging
    RadixChat,
    RadixMessage,
    RadixMessageUpdate,
    RadixMessagingAccountSystem,

    // POW
    RadixPOW,
    RadixPOWTask,

    // Token
    RadixTokenManager,
    radixTokenManager,

    // TxBuilder
    RadixTransactionBuilder,
}
