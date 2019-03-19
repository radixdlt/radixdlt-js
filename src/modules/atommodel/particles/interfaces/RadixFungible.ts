import { RadixFungibleType } from '../..';
import BN from 'bn.js'

export interface RadixFungible {
    getAmount(): BN,
    getPlanck(): number,
    getNonce(): number,
    getType(): RadixFungibleType,
}
