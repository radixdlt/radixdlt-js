import universe_development from '../common/universe_development'
import universe_highgarden from '../common/universe_highgarden'
import universe_alphanet from '../common/universe_alphanet'
import universe_alphanet2 from '../common/universe_alphanet2'
import universe_sunstone from '../common/universe_sunstone'

import Long from 'long'

export default class RadixUniverseConfig {
    public static WINTERFELL = new RadixUniverseConfig(universe_development)
    public static WINTERFELL_LOCAL = new RadixUniverseConfig(universe_development)
    public static SUNSTONE = new RadixUniverseConfig(universe_sunstone)
    public static HIGHGARDEN = new RadixUniverseConfig(universe_highgarden)
    public static ALPHANET = new RadixUniverseConfig(universe_alphanet)
    public static ALPHANET2 = new RadixUniverseConfig(universe_alphanet2)

    public readonly port: number
    public readonly name: string
    public readonly description: string
    public readonly type: number
    public readonly timestamp: number
    public readonly creator: Buffer
    public readonly genesis: any

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
        //     .mul(new BN(31 * 13 * 7 * this.port * this.type))
        //     .mul(new BN(this.timestamp))

        this.magic = obj.magic
    }

    public getMagic(): number {
        return this.magic
    }

    public getMagicByte(): number {
        return Long.fromNumber(this.magic)
            .and(0xff)
            .toNumber()
    }
}
