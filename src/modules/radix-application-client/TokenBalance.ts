import { RadixAddress, RRI } from '../atommodel'
import Decimal from 'decimal.js'

export interface TokenBalance {
    token: RRI
    owner: RadixAddress
    amount: Decimal
}
