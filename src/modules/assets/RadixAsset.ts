import RadixAtom from '../atom/RadixAtom'
import RadixBase64 from '../common/RadixBASE64'

export enum RadixAssetFlags {
  ASSET_TRADEABLE = 1, // Asset is tradeable on the exchange
  ASSET_SPENDABLE = 2, // Asset is spendable (user - user transactions)
  ASSET_REDEEMABLE = 4, // Asset is redeemable at dealers
  ASSET_RECOVERABLE = 8, // Asset is convertible to EMU
  ASSET_CHARGABLE = 16, // Asset can pay fees
  ASSET_DIVIDENDS = 1024, // Asset pays dividends
  ASSET_SYSTEM = 4096, // Asset is	a system asset
  ASSET_STABILIZED = 16384 // Asset is stabilised
}

export default class RadixAsset extends RadixAtom {
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

  toAsset(value: number) {
    return Math.trunc(value * this.sub_units)
  }

  toDecimal(value: number) {
    return value / this.sub_units
  }
}
