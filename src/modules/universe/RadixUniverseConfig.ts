import universe_development from './configs/universe_development'
import universe_highgarden from './configs/universe_highgarden'
import universe_alphanet from './configs/universe_alphanet'
import universe_sunstone from './configs/universe_sunstone'
import universe_betanet from './configs/universe_betanet'

import Long from 'long'
import { RadixSerializer, RadixAtom } from '../atommodel';

export default class RadixUniverseConfig {
    public static WINTERFELL = new RadixUniverseConfig(universe_development) // Outdated
    public static WINTERFELL_LOCAL = new RadixUniverseConfig(universe_development) // Outdated
    public static SUNSTONE = new RadixUniverseConfig(universe_betanet)
    public static HIGHGARDEN = new RadixUniverseConfig(universe_highgarden) // Outdated
    public static ALPHANET = new RadixUniverseConfig(universe_alphanet) // Outdated
    public static BETANET = new RadixUniverseConfig(universe_betanet)

    
    public port: number
    public name: string
    public description: string
    public type: number
    public timestamp: number
    public creator: Buffer
    public genesis: RadixAtom[]

    private magic: number
    private magicByte: number

    constructor(readonly rawJson: any) {
        this.magic = rawJson.magic  
        this.magicByte = Long.fromNumber(this.magic).and(0xff).toNumber()
    }

    public initialize() {
        const obj = RadixSerializer.fromJSON(this.rawJson)

        this.port = obj.port
        this.name = obj.name
        this.description = obj.description
        this.type = obj.type
        this.timestamp = obj.timestamp
        this.creator = obj.creator
        this.genesis = obj.genesis
    }

    public getMagic(): number {
        return this.magic
    }

    public getMagicByte(): number {
        return this.magicByte
    }
}
