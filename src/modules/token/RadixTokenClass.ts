import {RadixAtom,
    RadixBase64,
    } from '../atom_model'

import { Decimal } from 'decimal.js'

export enum RadixTokenFlags {
  TOKEN_TRADEABLE = 1, // Token is tradeable on the exchange
  TOKEN_SPENDABLE = 2, // Token is spendable (user - user transactions)
  TOKEN_REDEEMABLE = 4, // Token is redeemable at dealers
  TOKEN_RECOVERABLE = 8, // Token is convertible to EMU
  TOKEN_CHARGABLE = 16, // Token can pay fees
  TOKEN_DIVIDENDS = 1024, // Token pays dividends
  TOKEN_SYSTEM = 4096, // Token is a system token
  TOKEN_STABILIZED = 16384 // Token is stabilised
}

export default class RadixTokenClass extends RadixAtom {
  public static SERIALIZER = 62583504

  type: string
  iso: string
  description: string
  classification: string
  icon: RadixBase64
  sub_units: number
  maximum_units: number
  settings: number

  constructor(json?: object) {
    super(json)

    this.serializationProperties.push('type')
    this.serializationProperties.push('iso')
    this.serializationProperties.push('description')
    this.serializationProperties.push('classification')
    this.serializationProperties.push('icon')
    this.serializationProperties.push('sub_units')
    this.serializationProperties.push('maximum_units')
    this.serializationProperties.push('settings')
  }

  toToken(value: number): number {
    let x = new Decimal(value)
    let y = new Decimal(this.sub_units)

    return x.times(y).truncated().toNumber()
  }

  toDecimal(value: number): number {
    let x = new Decimal(value)
    let y = new Decimal(this.sub_units)

    return x.dividedBy(y).toNumber()
  }
}
