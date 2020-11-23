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

import cbor from 'cbor'

import { TSMap } from 'typescript-map'

import { logger } from '../../common/RadixLogger'
import { RadixSerializableObject } from '..'

import 'reflect-metadata'
import { isEmpty } from '../../common/RadixUtil'

export const JSON_PROPERTIES_KEY = 'JSON_SERIALIZATION_PROPERTIES'
export const DSON_PROPERTIES_KEY = 'DSON_SERIALIZATION_PROPERTIES'

/**
 * Decorator to register a property for JSON serialization.
 *   Stores property names in the prototype metadata
 * @param target 
 * @param propertyName 
 */
export function includeJSON(target: RadixSerializableObject, propertyName: string) {
    registerPropertyForSerialization(target, propertyName, JSON_PROPERTIES_KEY)
}

/**
 * Decorator to register a property for DSON serialization.
 *   Stores property names in the prototype metadata
 * @param target 
 * @param propertyName 
 */
export function includeDSON(target: RadixSerializableObject, propertyName: string) {
    registerPropertyForSerialization(target, propertyName, DSON_PROPERTIES_KEY)
}

/**
 * Registers property for serialization.
 *   Stores an array of property names in the prototype metadata.
 *   Inherits from the object prototype chain.
 * @param target 
 * @param propertyName 
 * @param metadataKey 
 */
function registerPropertyForSerialization(target: RadixSerializableObject, propertyName: string, metadataKey: string) {
    // Avoid modifying parent metadata, clone instead
    if (!Reflect.hasOwnMetadata(metadataKey, target)) {
        let props = []
        if (Reflect.hasMetadata(metadataKey, target)) {
            // Clone parent metadata
            props = Reflect.getMetadata(metadataKey, target).slice(0)
        }
        Reflect.defineMetadata(metadataKey, props, target)
    }
    Reflect.getMetadata(metadataKey, target).push(propertyName)
    Reflect.getMetadata(metadataKey, target).sort()
}

export class RadixSerializer {

    private static classes: TSMap<string, typeof RadixSerializableObject> = new TSMap()
    private static primitives: TSMap<string, object & { fromJSON: (input: string) => void }> = new TSMap()

    /**
     * Decorator to register a class for serialization
     * @param serializer serializer id
     * @returns  
     */
    public static registerClass(serializer: string) {
        return (constructor: typeof RadixSerializableObject) => {
            constructor.SERIALIZER = serializer

            this.classes.set(serializer, constructor)
        }
    }

    /**
     * Registers advanced 'primitive' types for serialization
     * @param tag 
     * @returns  
     */
    public static registerPrimitive(tag: string) {
        return (constructor: Object & { fromJSON: (input: string) => void }) => {
            this.primitives.set(tag, constructor)
        }
    }

    public static toJSON(data: any): any {
        if (Array.isArray(data)) {
            const output = []
            for (const item of data) {
                output.push(RadixSerializer.toJSON(item))
            }
            return output
        } else if (
            typeof data === 'number' ||
            typeof data === 'boolean'
        ) {
            return data
        } else if (
            typeof data === 'string'
        ) {
            return `:str:${data}`
        } else if (data !== null && typeof data === 'object') {
            if (typeof data.toJSON === 'function') {
                return data.toJSON()
            } else {
                const output = {}
                for (const key in data) {
                    const serialized = RadixSerializer.toJSON(data[key])
                    if (!isEmpty(serialized)) {
                        output[key] = serialized
                    }
                }

                return output
            }
        }
    }

    public static fromJSON(json: any): any {
        if (Array.isArray(json)) {
            const output = []
            for (const item of json) {
                output.push(RadixSerializer.fromJSON(item))
            }
            return output
        } else if (typeof json === 'object') {
            return RadixSerializer.fromJSONObject(json)
        } else if (typeof json === 'string') {
            // Advanced primitives
            const tag = (json as string).slice(0, 5)

            if (tag === ':str:') {
                return (json as string).slice(5)
            }

            // Cast to a primitve class
            if (this.primitives.has(tag)) {
                return this.primitives.get(tag).fromJSON((json as string).slice(5))
            }

            logger.warn(`No matching class for primitive string "${json}"`)
        } else {
            return json
        }
    }

    public static fromJSONObject(jsonObject: object) {
        const output = {}

        for (const key in jsonObject) {
            output[key] = (key === 'serializer' ? jsonObject[key] : RadixSerializer.fromJSON(jsonObject[key]))
        }

        if ('serializer' in output) {
            // tslint:disable-next-line:no-string-literal
            const type: string = output['serializer']

            if (this.classes.has(type)) {
                return this.classes.get(type).fromJSON(output)
            }
        }

        return output
    }

    public static toDSON(data: any): Buffer {
        const enc = new cbor.Encoder({ highWaterMark: 90000 }) // increase highWaterMark to allow for larger data chunks to be processed

        // Overide default object encoder to use stream encoding and lexicographical ordering of keys
        enc.addSemanticType(Object, (encoder, obj) => {
            const keys = Object.keys(obj)

            keys.sort()

            if (!encoder.push(Buffer.from([0b1011_1111]))) { return false }

            for (const key of keys) {
                if (isEmpty(obj[key])) {
                    continue
                }

                if (!encoder.pushAny(key)) { return false }
                if (!encoder.pushAny(obj[key])) { return false }
            }

            if (!encoder.push(Buffer.from([0xFF]))) { return false }

            return true
        })

        return enc._encodeAll([data])
    }
}


