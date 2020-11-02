/*
 * (C) Copyright 2020 Radix DLT Ltd
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the “Software”),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */


import betanet from '../../universe/configs/betanet.json'
import sunstone from '../../universe/configs/sunstone.json'
import local from '../../universe/configs/local.json'

import Long from 'long'

import { RadixSerializer, RadixAtom, RadixSerializableObject, RadixBytes, RadixEUID } from '..'

import { includeJSON, includeDSON } from '../serializer/RadixSerializer'

export enum RadixUniverseType {
    PRODUCTION,
    TEST,
    DEVELOPMENT,
}

export const universeTypeToString = (universeType: RadixUniverseType): string => {
    switch (universeType) {
        case RadixUniverseType.DEVELOPMENT: return 'Development'
        case RadixUniverseType.TEST: return 'Test'
        case RadixUniverseType.PRODUCTION: return 'Production'
    }
}

@RadixSerializer.registerClass('radix.universe')
export class RadixUniverseConfig extends RadixSerializableObject {   
    public static LOCAL = new RadixUniverseConfig(local)

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
    public type: RadixUniverseType

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
