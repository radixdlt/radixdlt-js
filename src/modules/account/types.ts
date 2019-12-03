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

export function concatMaps(map1: TSMap<any, any>, map2: TSMap<any, any>): TSMap<any, any> {
    const newMap = map2.clone()
    map1.forEach((value, key) => {
        newMap.set(key, value)
    })
    return newMap
}
