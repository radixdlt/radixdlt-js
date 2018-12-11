import { expect } from 'chai'
import 'mocha'
import BN from 'bn.js'

import { RadixSerializer, RadixBytes, RadixParticle, JSON_PROPERTIES_KEY, RadixEUID, RadixHash, RadixAddress, RadixUInt256 } from '..';
import { javaHashCode } from './RadixSerializer';

const examples: Array<{
    name: string,
    native: any,
    json?: any,
    dson?: Buffer,
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
    native: {a: 1, b: 2},
    json: {a: 1, b: 2},
    dson: Buffer.from([0b1011_1111, 0b0110_0001, 0x61, 0x01, 0b0110_0001, 0x62, 0x02, 0xFF]),
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
        0, 0, 0, 0, 0, 0, 0, 1 ]),
    })
    
    

// hash
examples.push({
    name: 'uint256',
    native: new RadixUInt256(1),
    json: `:u20:1`,
    dson: Buffer.from([0b010_11000, 0b0010_0001, 0x05, 
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1 ]),
    })


// Complex objects
examples.push({
    name: 'complex_perticle',
    native: new RadixParticle(),
    json: {version: 100, serializer: javaHashCode('PARTICLE'), quarks: []},
})

const messageAtomDSON = "v2lwYXJ0aWNsZXOEv2hwYXJ0aWNsZb9kZnJvbVgnBAIDY7VjKQcsDUl1eDXLJ+BpJFsK6j6QUJjuJ6epmacsgjyHWiXLZnF1YXJrc4K/aWFkZHJlc3Nlc4JYJwQCA2O1YykHLA1JdXg1yyfgaSRbCuo+kFCY7ienqZmnLII8h1oly1gnBAID3kkWhfwvYx6Hyht7lW4yQAqPths5TEJWtBhBNE44CQKSyqOcanNlcmlhbGl6ZXIaMdc1D2d2ZXJzaW9uGGT/v2VieXRlc1kBcAFbInAvTHY1cnJ0Z25xWmlOTXpIQjBKWXlFRGs4THNDUDAvYWlLMUN6a1U5TFJlZzhQaFhwL0hFamtUU0NsaTZPajlNUm9BQUFBdzNWZHhydTR3NXkyTmxEREs0dzF3WmxCZHMydjgzdjF6Vm5odmRiRFVnVThOeWtsM29UYnRSb2FzdVgxYmpiUml3RDViblJpeDJKV3N0dlBlcXl4cGZDSERYaU5HK2ZtOHYvb2w1UytaOUowPSIsIkNIU012dHBOM2V0cVJqZityclh5WWlFQ2k3NWdYMzE2azk1VVovRGhKa1pUZ3RCM1Q5ZXluaUN2TzlUVXlYZ1BjRjBBQUFBd0p1UjlHajVxQ2lOZmtHYm5Icms2bDU2d0pjc1gvQmVMdTJhMTg0L0JMYVczZy9TREhzR3dXTTdBaDk1NFRSZUdsaWx0MjFkbVMyV1lPK0FNTEd0QllBS3hlVDBXM0t5VnBLR2FkM1NzVDI0PSJdaG1ldGFEYXRhv2thcHBsaWNhdGlvbmllbmNyeXB0b3JrY29udGVudFR5cGVwYXBwbGljYXRpb24vanNvbv9qc2VyaWFsaXplcjpukpvTZ3ZlcnNpb24YZP9qc2VyaWFsaXplcjpKweySZ3ZlcnNpb24YZP9qc2VyaWFsaXplcjo7MMXDZHNwaW4BZ3ZlcnNpb24YZP+/aHBhcnRpY2xlv2Rmcm9tWCcEAgNjtWMpBywNSXV4Ncsn4GkkWwrqPpBQmO4np6mZpyyCPIdaJctmcXVhcmtzgr9pYWRkcmVzc2VzglgnBAIDY7VjKQcsDUl1eDXLJ+BpJFsK6j6QUJjuJ6epmacsgjyHWiXLWCcEAgPeSRaF/C9jHofKG3uVbjJACo+2GzlMQla0GEE0TjgJApLKo5xqc2VyaWFsaXplchox1zUPZ3ZlcnNpb24YZP+/ZWJ5dGVzWGcBNFtvxOpj/frgm8z5gKWw4SECKEcaRBMTrxf5LcAEeH7h28g6PLo++ebZaf8+KBJ3eVsAAAAQMAYx4uJC0rGCdzbhBKzXJIbvWS2UfmQZ9k3Lwnp9KGe68bQulb/GwzhnowELVzMSaG1ldGFEYXRhv2thcHBsaWNhdGlvbmdtZXNzYWdl/2pzZXJpYWxpemVyOm6Sm9NndmVyc2lvbhhk/2pzZXJpYWxpemVyOkrB7JJndmVyc2lvbhhk/2pzZXJpYWxpemVyOjswxcNkc3BpbgFndmVyc2lvbhhk/79ocGFydGljbGW/ZnF1YXJrc4G/anNlcmlhbGl6ZXI6HYMHLGp0aW1lc3RhbXBzv2dkZWZhdWx0GwAAAWec9kY4/2d2ZXJzaW9uGGT/anNlcmlhbGl6ZXI6YBG+g2d2ZXJzaW9uGGT/anNlcmlhbGl6ZXI6OzDFw2RzcGluAWd2ZXJzaW9uGGT/v2hwYXJ0aWNsZb9mcXVhcmtzg79lb3duZXJYIgEDY7VjKQcsDUl1eDXLJ+BpJFsK6j6QUJjuJ6epmacsgjxqc2VyaWFsaXplchoEDgvWZ3ZlcnNpb24YZP+/aWFkZHJlc3Nlc4FYJwQCA2O1YykHLA1JdXg1yyfgaSRbCuo+kFCY7ienqZmnLII8h1oly2pzZXJpYWxpemVyGjHXNQ9ndmVyc2lvbhhk/79mYW1vdW50WCEFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHF5lbm9uY2UbAAHyzlRkUA1mcGxhbmNrGwFJPFP5MCVAanNlcmlhbGl6ZXIaIiLKvGR0eXBlZm1pbnRlZGd2ZXJzaW9uGGT/anNlcmlhbGl6ZXI6BbdYE2dzZXJ2aWNlUQIAAAAAAAAAAAAAAAAAAAABb3Rva2VuX3JlZmVyZW5jZb9nYWRkcmVzc1gnBAIDeFqcJZ/emZHkT6L7C1ZZ8qV4GsM5B24tv+9wUo5K32iIecG5anNlcmlhbGl6ZXI6Qy5NE2Z1bmlxdWVjUE9XZ3ZlcnNpb24YZP9ndmVyc2lvbhhk/2pzZXJpYWxpemVyOjswxcNkc3BpbgFndmVyc2lvbhhk/2pzZXJpYWxpemVyGgAe0VFndmVyc2lvbhhk/w=="
const messageAtomJSON = {
    "temporal_proof": {
        "vertices": [{
            "owner": ":byt:A/y71gjp+XwiNFUsX4KSIofEC/C3orIZZjII1VFGtK0s",
            "previous": ":uid:00000000000000000000000000000000",
            "signature": {
                "r": ":byt:AJB5zRET+utj78t/PEh7ifeGyErLmn4ovvqsrqduwQYA",
                "s": ":byt:AOI2aUoRCa6At0tTGff+5g0spOlNYh13ZOSZwbJTfTxw",
                "serializer": -434788200,
                "version": 100
            },
            "timestamps": {
                "default": 1544526651768
            },
            "serializer": -909337786,
            "commitment": ":hsh:0000000000000000000000000000000000000000000000000000000000000000",
            "clock": 1,
            "version": 100
        }, {
            "owner": ":byt:Apw/nakD1xKCDbisfPWanPC9t5/Kp1J9V3RoFxbMma1G",
            "previous": ":uid:6a4de7d15aa536ce5268101f8abb0187",
            "signature": {
                "r": ":byt:APOF/FZlJU03AbGhIaDnkSCmXdLes2Lp9tiwjhYV73xV",
                "s": ":byt:AM9WQ+xqVlsx1O84vJ9RACrRBBmF2NqNw6fFVnjPB1N9",
                "serializer": -434788200,
                "version": 100
            },
            "timestamps": {
                "default": 1544526659595
            },
            "serializer": -909337786,
            "commitment": ":hsh:0000000000000000000000000000000000000000000000000000000000000000",
            "clock": 1,
            "version": 100
        }],
        "serializer": 1905172290,
        "version": 100,
        "object_id": ":uid:d81e6510c4811e48cedb796978de838d"
    },
    "serializer": 2019665,
    "particles": [{
        "spin": 1,
        "serializer": -993052100,
        "particle": {
            "serializer": -1254222995,
            "from": ":adr:JGrHmqCBuXbpyC9sydngJKTxbpUNvpste8jjKuZixayUd6neXiJ",
            "version": 100,
            "quarks": [{
                "addresses": [":adr:JGrHmqCBuXbpyC9sydngJKTxbpUNvpste8jjKuZixayUd6neXiJ", ":adr:JHnGqXsMZpTuGwt1kU92mSpKasscJzfkkZJHe2vaEvBM3jJiVBq"],
                "serializer": 836187407,
                "version": 100
            }, {
                "metaData": {
                    "application": ":str:encryptor",
                    "contentType": ":str:application/json"
                },
                "bytes": ":byt:WyJwL0x2NXJydGducVppTk16SEIwSll5RURrOExzQ1AwL2FpSzFDemtVOUxSZWc4UGhYcC9IRWprVFNDbGk2T2o5TVJvQUFBQXczVmR4cnU0dzV5Mk5sRERLNHcxd1psQmRzMnY4M3YxelZuaHZkYkRVZ1U4TnlrbDNvVGJ0Um9hc3VYMWJqYlJpd0Q1Ym5SaXgySldzdHZQZXF5eHBmQ0hEWGlORytmbTh2L29sNVMrWjlKMD0iLCJDSFNNdnRwTjNldHFSamYrcnJYeVlpRUNpNzVnWDMxNms5NVVaL0RoSmtaVGd0QjNUOWV5bmlDdk85VFV5WGdQY0YwQUFBQXdKdVI5R2o1cUNpTmZrR2JuSHJrNmw1NndKY3NYL0JlTHUyYTE4NC9CTGFXM2cvU0RIc0d3V003QWg5NTRUUmVHbGlsdDIxZG1TMldZTytBTUxHdEJZQUt4ZVQwVzNLeVZwS0dhZDNTc1QyND0iXQ==",
                "serializer": -1855101908,
                "version": 100
            }]
        },
        "version": 100
    }, {
        "spin": 1,
        "serializer": -993052100,
        "particle": {
            "serializer": -1254222995,
            "from": ":adr:JGrHmqCBuXbpyC9sydngJKTxbpUNvpste8jjKuZixayUd6neXiJ",
            "version": 100,
            "quarks": [{
                "addresses": [":adr:JGrHmqCBuXbpyC9sydngJKTxbpUNvpste8jjKuZixayUd6neXiJ", ":adr:JHnGqXsMZpTuGwt1kU92mSpKasscJzfkkZJHe2vaEvBM3jJiVBq"],
                "serializer": 836187407,
                "version": 100
            }, {
                "metaData": {
                    "application": ":str:message"
                },
                "bytes": ":byt:NFtvxOpj/frgm8z5gKWw4SECKEcaRBMTrxf5LcAEeH7h28g6PLo++ebZaf8+KBJ3eVsAAAAQMAYx4uJC0rGCdzbhBKzXJIbvWS2UfmQZ9k3Lwnp9KGe68bQulb/GwzhnowELVzMS",
                "serializer": -1855101908,
                "version": 100
            }]
        },
        "version": 100
    }, {
        "spin": 1,
        "serializer": -993052100,
        "particle": {
            "serializer": -1611775620,
            "version": 100,
            "quarks": [{
                "timestamps": {
                    "default": 1544526644792
                },
                "serializer": -495126317,
                "version": 100
            }]
        },
        "version": 100
    }, {
        "spin": 1,
        "serializer": -993052100,
        "particle": {
            "token_reference": {
                "address": ":adr:JH1P8f3znbyrDj8F4RWpix7hRkgxqHjdW2fNnKpR3v6ufXnknor",
                "unique": ":str:POW",
                "serializer": -1127107860,
                "version": 100
            },
            "service": ":uid:00000000000000000000000000000001",
            "serializer": -95901716,
            "version": 100,
            "quarks": [{
                "owner": ":byt:A2O1YykHLA1JdXg1yyfgaSRbCuo+kFCY7ienqZmnLII8",
                "serializer": 68029398,
                "version": 100
            }, {
                "addresses": [":adr:JGrHmqCBuXbpyC9sydngJKTxbpUNvpste8jjKuZixayUd6neXiJ"],
                "serializer": 836187407,
                "version": 100
            }, {
                "amount": ":u20:7262",
                "serializer": 572705468,
                "type": ":str:minted",
                "version": 100,
                "nonce": 548442969755661,
                "planck": 92671598698440000
            }]
        },
        "version": 100
    }],
    "version": 100,
    "signatures": {
        "429ffc0e09be10b5987922945b9fa1b8": {
            "r": ":byt:ALuL3Uk+Cpe2/dAFRvex3aChcOK3rMLW3LeaNtgGVwkN",
            "s": ":byt:Wt4V6Wodr0HTytnVuD1qC0jM1Iptp3fMQQs0CH/glKM=",
            "serializer": -434788200,
            "version": 100
        }
    }
}


// TODO: Need to get a new one from the core
// examples.push({
//     name: 'complex_message',
//     native: RadixSerializer.fromJSON(messageAtomJSON),
//     json: messageAtomJSON,
//     dson: Buffer.from(messageAtomDSON, 'base64'),
//     })



describe('JSON', () => {

    for (const example of examples) {
        if (example.json !== 'undefined') {
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
