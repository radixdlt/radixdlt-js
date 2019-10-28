
import betanet from '../../universe/configs/betanet.json'
import sunstone from '../../universe/configs/sunstone.json'
import local from '../../universe/configs/local.json'

import Long from 'long'
import { RadixSerializer, RadixAtom, RadixSerializableObject } from '..'
import { includeJSON, includeDSON } from '../serializer/RadixSerializer'

@RadixSerializer.registerClass('radix.universe')
export class RadixUniverseConfig extends RadixSerializableObject {   
    public static SUNSTONE = new RadixUniverseConfig(sunstone)
    public static LOCAL = new RadixUniverseConfig(local) 
    public static BETANET = new RadixUniverseConfig(betanet)
    
    @includeJSON
    @includeDSON
    public port: number

    @includeJSON
    @includeDSON
    public name: string

    @includeJSON
    @includeDSON
    public description: string

    @includeJSON
    @includeDSON
    public type: number

    @includeJSON
    @includeDSON
    public timestamp: number

    @includeJSON
    @includeDSON
    public creator: Buffer

    @includeJSON
    @includeDSON
    public genesis: RadixAtom[]

    private magic: number
    private magicByte: number

    constructor(readonly rawJson: any) {
        super()
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
