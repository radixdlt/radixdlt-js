
import betanet from './configs/betanet.json'
import sunstone from './configs/sunstone.json'
import local from './configs/local.json'

import Long from 'long'
import { RadixSerializer, RadixAtom } from '../atommodel';

export default class RadixUniverseConfig {   
    public static SUNSTONE = new RadixUniverseConfig(sunstone)
    public static LOCAL = new RadixUniverseConfig(local) 
    public static BETANET = new RadixUniverseConfig(betanet)
    
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
