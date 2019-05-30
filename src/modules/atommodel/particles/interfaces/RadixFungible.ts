import { RadixFungibleType } from '../..';
import BN from 'bn.js'

export interface RadixFungible {
    getAmount(): BN,
}
