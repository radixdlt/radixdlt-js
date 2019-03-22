import 'mocha'
import { expect } from 'chai'

import BN from 'bn.js'

import {
    JSON_PROPERTIES_KEY,
    RadixSerializer,
    RadixBytes,
    RadixParticle,
    RadixEUID,
    RadixHash,
    RadixAddress,
    RadixUInt256,
    RadixResourceIdentifier,
} from '..'
import { javaHashCode } from './RadixSerializer'

const examples: Array<{
    name: string,
    native: any,
    json?: any,
    dson?: Buffer,
    dontDeserialize?: boolean,
}> = []


// Primitives

// bool_false
examples.push({
    name: 'bool_false',
    native: false,
    json: false,
    dson: Buffer.from([0b1111_0100]),
})

// bool_true
examples.push({
    name: 'bool_true',
    native: true,
    json: true,
    dson: Buffer.from([0b1111_0101]),
})

// number
examples.push({
    name: 'number_10',
    native: 10,
    json: 10,
    dson: Buffer.from([0b0000_1010]),
})
examples.push({
    name: 'number_128',
    native: 128,
    json: 128,
    dson: Buffer.from([0b0001_1000, 0b1000_0000]),
})
examples.push({
    name: 'number_256',
    native: 256,
    json: 256,
    dson: Buffer.from([0b0001_1001, 0b0000_0001, 0b0000_0000]),
})
examples.push({
    name: 'number_500',
    native: 500,
    json: 500,
    dson: Buffer.from([0b0001_1001, 0b0000_0001, 0b1111_0100]),
})
examples.push({
    name: 'number_-1',
    native: -1,
    json: -1,
    dson: Buffer.from([0b0010_0000]),
})
examples.push({
    name: 'number_-500',
    native: -500,
    json: -500,
    dson: Buffer.from([0b0011_1001, 0b0000_0001, 0b1111_0011]),
})
// examples.push({
//     name: 'number_92671598698440000',
//     native: 92671598698440000,
//     json: 92671598698440000,
//     dson: Buffer.from([27, 1, 73, 60, 83, 249, 48, 37, 64]),
// })
// examples.push({
//     name: 'number_18446744073709551615',
//     native: 18446744073709551615,
//     json: 18446744073709551615,
//     dson: Buffer.from('1bffffffffffffffff', 'hex'),
// })

// string
examples.push({
    name: 'string_a',
    native: 'a',
    json: ':str:a',
    dson: Buffer.from([0x61, 0x61]),
})


examples.push({
    name: 'string_Radix',
    native: 'Radix',
    json: ':str:Radix',
    dson: Buffer.from([0b0110_0101, 0x52, 0x61, 0x64, 0x69, 0x78]),
})




// sequence
examples.push({
    name: 'sequence_1,2,3,4',
    native: [1, 2, 3, 4],
    json: [1, 2, 3, 4],
    dson: Buffer.from([0b1000_0100, 0x01, 0x02, 0x03, 0x04]),
})

// map
examples.push({
    name: 'map_a:1,b:2',
    native: { a: 1, b: 2 },
    json: { a: 1, b: 2 },
    dson: Buffer.from([0b1011_1111, 0b0110_0001, 0x61, 0x01, 0b0110_0001, 0x62, 0x02, 0xFF]),
})


// map
examples.push({
    name: 'map_a:1,b:2_exclude_undefined',
    native: { a: 1, b: 2, c: undefined },
    json: { a: 1, b: 2 },
    dson: Buffer.from([0b1011_1111, 0b0110_0001, 0x61, 0x01, 0b0110_0001, 0x62, 0x02, 0xFF]),
    dontDeserialize: true,
})

examples.push({
    name: 'map_a:1,b:2_exclude_empty_array',
    native: { a: 1, b: 2, c: [] },
    json: { a: 1, b: 2 },
    dson: Buffer.from([0b1011_1111, 0b0110_0001, 0x61, 0x01, 0b0110_0001, 0x62, 0x02, 0xFF]),
    dontDeserialize: true,
})

examples.push({
    name: 'map_a:1,b:2_exclude_empty_object',
    native: { a: 1, b: 2, c: {} },
    json: { a: 1, b: 2 },
    dson: Buffer.from([0b1011_1111, 0b0110_0001, 0x61, 0x01, 0b0110_0001, 0x62, 0x02, 0xFF]),
    dontDeserialize: true,
})

examples.push({
    name: 'map_a:1,b:false',
    native: { a: 1, b: false },
    json: { a: 1, b: false },
    dson: Buffer.from([0b1011_1111, 0b0110_0001, 0x61, 0x01, 0b0110_0001, 0x62, 0b1111_0100, 0xFF]),
    dontDeserialize: true,
})




// Advnaced primitives

// bytes
examples.push({
    name: 'bytes',
    native: new RadixBytes([0x89, 0xAB, 0xCD, 0xEF]),
    json: `:byt:${Buffer.from([0x89, 0xAB, 0xCD, 0xEF]).toString('base64')}`,
    dson: Buffer.from([0b0100_0101, 0x01, 0x89, 0xAB, 0xCD, 0xEF]),
})

// EUID
examples.push({
    name: 'EUID',
    native: new RadixEUID([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10]),
    json: `:uid:${Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10]).toString('hex')}`,
    dson: Buffer.from([0b0101_0001, 0x02, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10]),
})

// hash
examples.push({
    name: 'hash',
    native: new RadixHash('0000000000000000000000000000000000000000000000000000000000000001'),
    json: `:hsh:0000000000000000000000000000000000000000000000000000000000000001`,
    dson: Buffer.from([0b010_11000, 0b0010_0001, 0x03,
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1]),
})



// uint256
examples.push({
    name: 'uint256',
    native: new RadixUInt256(1),
    json: `:u20:1`,
    dson: Buffer.from([0b010_11000, 0b0010_0001, 0x05,
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1]),
})

// RadixResourceIdentifier
const address = RadixAddress.fromAddress('JHnGqXsMZpTuGwt1kU92mSpKasscJzfkkZJHe2vaEvBM3jJiVBq')
examples.push({
    name: 'rri',
    native: new RadixResourceIdentifier(address, 'test', 'test2'),
    json: `:rri:/${address.toString()}/test/test2`,
    // dson: Buffer.from([0b010_10111, 0x06, 0x2f, ]),
})


// Complex objects
// examples.push({
//     name: 'complex_perticle',
//     native: new RadixParticle(),
//     json: { version: 100, serializer: javaHashCode('PARTICLE'), quarks: [] },
// })

import DsonTestExample from './DsonTestExample'

// examples.push({
//     name: 'complex_message_atom',
//     native: RadixSerializer.fromJSON(DsonTestExample.atoms[0]),
//     json: DsonTestExample.atoms[0],
//     dson: Buffer.from(DsonTestExample.atomsBinary[0], 'base64'),
//     })


// examples.push({
//     name: 'complex_transfer_atom',
//     native: RadixSerializer.fromJSON(DsonTestExample.atoms[1]),
//     json: DsonTestExample.atoms[1],
//     dson: Buffer.from(DsonTestExample.atomsBinary[1], 'base64'),
//     })



describe('JSON', () => {

    for (const example of examples) {
        if (example.json !== 'undefined' && !example.dontDeserialize) {
            it(`should deserialize "${example.name}" from json`, () => {
                expect(RadixSerializer.fromJSON(example.json)).to.deep.equal(example.native)
            })
        }
    }


    for (const example of examples) {
        if (example.json !== 'undefined') {
            it(`should serialize "${example.name}" to json`, () => {
                expect(RadixSerializer.toJSON(example.native)).to.deep.equal(example.json)
            })
        }
    }

})



describe('DSON', () => {

    for (const example of examples) {
        if (example.dson) {
            it(`should serialize "${example.name}" to dson`, () => {
                expect(RadixSerializer.toDSON(example.native)).to.deep.equal(example.dson)
            })
        }
    }

})
