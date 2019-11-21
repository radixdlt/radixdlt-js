import { TSMap } from 'typescript-map'
import { TransferState } from './RadixTransferAccountSystem'
import { TokenDefinitionState } from './RadixTokenDefinitionAccountSystem'

export type AccountState = TransferState & TokenDefinitionState

export const createInitialState = (): AccountState => {
    return {
        spentConsumables: undefined,
        unspentConsumables: undefined,
        balance: undefined,
        tokenUnitsBalance: undefined,
        tokenDefinitions: undefined
    }
}

export enum AtomOperation {
    STORE,
    DELETE
}

export enum TokenType {
    FIXED,
    MUTABLE,
    UNALLOCATED
}

export function concatMaps(map1: TSMap<any, any>, map2: TSMap<any, any>): TSMap<any, any> {
    let newMap = map2.clone()
    map1.forEach((value, key) => {
        newMap.set(key, value)
    })
    return newMap
}
