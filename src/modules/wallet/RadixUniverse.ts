import * as Long from 'long'
import universe_development from '../common/universe_development'
import universe_alphanet from '../common/universe_alphanet'
import universe_highgarden from '../common/universe_highgarden'

export default class RadixUniverse {
  private universes: Array<string> = ['RADIX_DEVELOPMENT']
  readonly port: number
  readonly name: string
  readonly description: string
  readonly type: number
  readonly timestamp: number
  readonly creator: Buffer
  readonly genesis: any
  private magic: number

  constructor(obj: any) {
    this.port = obj.port
    this.name = obj.name
    this.description = obj.description
    this.type = obj.type
    this.timestamp = obj.timestamp
    this.creator = Buffer.from(obj.creator.value, 'base64')
    this.genesis = obj.genesis

    // this.magic = this.creator.getUID().value
    //    .mul(new BN(31 * 13 * 7 * this.port * this.type))
    //    .mul(new BN(this.timestamp))

    this.magic = obj.magic
  }

  getMagic(): number {
    return this.magic
  }

  getMagicByte(): number {
    return Long.fromNumber(this.magic)
      .and(0xff)
      .toNumber()
  }

  fromMagic(magic: number): string {
    for (let universe of this.universes) {
      if (magic == (RadixUniverse.hashCode(universe) & 0xff)) {
        return universe
      }
    }

    return ''
  }

  static hashCode(input: string): number {
    let hash = 0
    if (input.length == 0) {
      return hash
    }

    for (let i = 0; i < input.length; i++) {
      let char = input.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash
  }
}

// export let radixUniverse = new RadixUniverse(universe_development)
export let radixUniverse = new RadixUniverse(universe_alphanet)
// export let radixUniverse = new RadixUniverse(universe_highgarden)
