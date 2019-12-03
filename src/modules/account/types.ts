import { TSMap } from 'typescript-map'
import { RadixTransferState } from './RadixTransferAccountSystem'
import { RadixTokenDefinitionState } from './RadixTokenDefinitionAccountSystem'

export interface RadixLedgerState {
    [address: string]: RadixAccountState
}

export interface RadixAccountState extends RadixTransferState, RadixTokenDefinitionState {}

export const createInitialState = (): RadixAccountState => {
    return {
        spentConsumables: undefined,
        unspentConsumables: undefined,
        balance: undefined,
        tokenUnitsBalance: undefined,
        tokenDefinitions: undefined,
    }
}

export enum AtomOperation {
    STORE,
    DELETE,
}

export enum RadixTokenType {
    FIXED,
    MUTABLE,
    UNALLOCATED,
}
