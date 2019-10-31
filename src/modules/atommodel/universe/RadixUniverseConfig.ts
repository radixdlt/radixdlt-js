
import betanet from '../../universe/configs/betanet.json'
import sunstone from '../../universe/configs/sunstone.json'
import local from '../../universe/configs/local.json'

import Long from 'long'

import { RadixSerializer, RadixAtom, RadixSerializableObject, RadixBytes, RadixEUID } from '..'

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
    public creator: RadixBytes

    @includeJSON
    @includeDSON
    public genesis: RadixAtom[]

    @includeJSON
    public 'signature.r': RadixBytes

    @includeJSON
    public 'signature.s': RadixBytes

    @includeJSON
    @includeDSON
    public planck: number

    @includeJSON
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
        this['signature.r'] = obj['signature.r']
        this['signature.s'] = obj['signature.s']
        this.planck = obj.planck
    }

    public getMagic(): number {
        return this.magic
    }

    public getMagicByte(): number {
        return this.magicByte
    }

    public getHid() {
        return new RadixEUID(this.getHash().slice(0, 16))
    }

    public getHidString() {
        return this.getHid().toString()
    }
}
