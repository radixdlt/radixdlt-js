import { expect } from 'chai'
import 'mocha'

import RadixSerializer, { DataTypes } from './RadixSerializer'
import RadixEUID from '../common/RadixEUID'
import RadixBase64 from '../common/RadixBASE64'
import RadixNullAtom from '../atom/RadixNullAtom'
import RadixHash from '../common/RadixHash'

describe('Json Serializer', () => {
  it('should deserialize from json', () => {
    expect(RadixSerializer.fromJson(json1)).to.deep.equal(out1)
    expect(RadixSerializer.fromJson(json2)).to.deep.equal(out2)
  })

  it('should serialize to json', () => {
    expect(RadixSerializer.toJson(out1)).to.deep.equal(json1)
    expect(RadixSerializer.toJson(out2)).to.deep.equal(json2)
  })
})

describe('Byte array serializer', () => {
  it('should serialize to a byte array', () => {
    for (let i = 0; i < byteSerializerIn.length; i++) {
      expect(RadixSerializer.toByteArray(byteSerializerIn[i])).to.deep.equal(
        byteSerializerOut[i]
      )
    }

    let atomFreshlySerialized = RadixSerializer.toByteArray(atom)

    expect(atomFreshlySerialized).to.deep.equal(atomSerialized)

    // expect(atom.getHID()).to.deep.equal(RadixEUID.fromJson(atomNotification.params.atoms[0].hid))
  })

  it('should deserialize from byte array', () => {
    for (let i = 0; i < byteSerializerIn.length; i++) {
      expect(RadixSerializer.fromByteArray(byteSerializerOut[i])).to.deep.equal(
        byteSerializerIn[i]
      )
    }

    let deserialized = RadixSerializer.fromByteArray(atomSerialized)

    //console.log(deserialized)
    //expect(atom).to.deep.equal(deserialized)
  })
})

//Test data
//Json
const json1 = {
  serializer: 'EUID',
  value: '123'
}

const out1 = new RadixEUID(123)

const json2 = [
  {
    serializer: 'EUID',
    value: '123'
  },
  456,
  {
    t1: {
      serializer: 'EUID',
      value: '789'
    }
  }
]

const out2 = [
  new RadixEUID(123),
  456,
  {
    t1: new RadixEUID(789)
  }
]

//Byte array

let byteSerializerIn = []
let byteSerializerOut = []

byteSerializerIn[0] = true
byteSerializerOut[0] = Buffer.from([
  DataTypes.BOOLEAN,
  /**/ 0x00,
  0x00,
  0x00,
  0x01,
  /**/ 0x01
])

byteSerializerIn[1] = 0xff
byteSerializerOut[1] = Buffer.from([
  DataTypes.NUMBER,
  /**/ 0x00,
  0x00,
  0x00,
  0x08,
  /**/ 0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0x00,
  0xff
])

byteSerializerIn[2] = 'abc'
byteSerializerOut[2] = Buffer.from([
  DataTypes.STRING,
  /**/ 0x00,
  0x00,
  0x00,
  0x03,
  /**/ 0x61,
  0x62,
  0x63
])

byteSerializerIn[3] = new RadixBase64([1, 2, 3])
byteSerializerOut[3] = Buffer.from([
  DataTypes.BYTES,
  /**/ 0x00,
  0x00,
  0x00,
  0x03,
  /**/ 0x1,
  0x2,
  0x3
])

byteSerializerIn[4] = new RadixEUID(1)
byteSerializerOut[4] = Buffer.from([
  DataTypes.EUID,
  /**/ 0x00,
  0x00,
  0x00,
  0x01,
  /**/ 0x1
])

byteSerializerIn[5] = { a: true }
byteSerializerOut[5] = Buffer.from([
  DataTypes.OBJECT,
  /**/ 0x00,
  0x00,
  0x00,
  0x08,
  /**/ 0x1,
  /**/ 0x61,
  /**/ DataTypes.BOOLEAN,
  /**/ 0x00,
  0x00,
  0x00,
  0x01,
  /**/ 0x01
])

byteSerializerIn[6] = ['a', 'b']
byteSerializerOut[6] = Buffer.from([
  DataTypes.ARRAY,
  /**/ 0x00,
  0x00,
  0x00,
  0x0c,
  /**/ DataTypes.STRING,
  /**/ 0x00,
  0x00,
  0x00,
  0x01,
  /**/ 0x61,
  /**/ DataTypes.STRING,
  /**/ 0x00,
  0x00,
  0x00,
  0x01,
  /**/ 0x62
])

//TODO: Hash
byteSerializerIn[7] = new RadixHash(
  '0000000000000000000000000000000000000000000000000000000000000001'
)
byteSerializerOut[7] = Buffer.from([
  DataTypes.HASH,
  /**/ 0x00,
  0x00,
  0x00,
  0x20 /**/,
  0x0,
  0x0,
  0x0,
  0x0,
  0x0,
  0x0,
  0x0,
  0x0,
  0x0,
  0x0,
  0x0,
  0x0,
  0x0,
  0x0,
  0x0,
  0x0,
  0x0,
  0x0,
  0x0,
  0x0,
  0x0,
  0x0,
  0x0,
  0x0,
  0x0,
  0x0,
  0x0,
  0x0,
  0x0,
  0x0,
  0x0,
  0x1
])

//Example atom subscribe update
const atomNotification = {
  jsonrpc: '2.0',
  method: 'Atoms.subscribeUpdate',
  params: {
    atoms: [
      {
        encrypted: {
          serializer: 'BASE64',
          value: 'QSBnaWZ0IGZvciB5b3Uh'
        },
        temporal_proof: {
          atom_id: {
            serializer: 'EUID',
            value: '-24728410192750831460565679779'
          },
          vertices: [
            {
              owner: {
                public: {
                  serializer: 'BASE64',
                  value: 'AgNlNmZXIX+GY+A3rkYloQSrE0d1eF8YQcm3LwXZXC8/'
                },
                serializer: 547221307,
                version: 100
              },
              previous: {
                serializer: 'EUID',
                value: '0'
              },
              signature: {
                r: {
                  serializer: 'BASE64',
                  value: 'AJrsc4oApyLtuP34VgB5RqREToGGku2z8H7ImD6WMcOV'
                },
                s: {
                  serializer: 'BASE64',
                  value: 'X+o08bmzbY3DUBSxoQF7Y53Zcetm3R2lg4UXxKu1inQ='
                },
                serializer: -434788200,
                version: 100
              },
              timestamps: {
                default: 1526929792561
              },
              commitment: {
                serializer: 'HASH',
                value:
                  '0000000000000000000000000000000000000000000000000000000000000000'
              },
              serializer: -909337786,
              clock: 294,
              version: 100
            }
          ],
          serializer: 1905172290,
          version: 100
        },
        timestamps: {
          default: 1526929792045
        },
        destinations: [
          {
            serializer: 'EUID',
            value: '2718254349849692569381964675'
          },
          {
            serializer: 'EUID',
            value: '31655847435213307464496696616'
          }
        ],
        action: 'STORE',
        serializer: -760130,
        particles: [
          {
            quantity: 99998000000,
            destinations: [
              {
                serializer: 'EUID',
                value: '31655847435213307464496696616'
              }
            ],
            serializer: 214856694,
            owners: [
              {
                public: {
                  serializer: 'BASE64',
                  value: 'A8qiisybzYWGnThN2beJfSQMHAHRK0WEVAeV54/rTlGp'
                },
                serializer: 547221307,
                version: 100
              }
            ],
            asset_id: {
              serializer: 'EUID',
              value: '80998'
            },
            nonce: 33237482139629,
            version: 100
          },
          {
            quantity: 99997000000,
            destinations: [
              {
                serializer: 'EUID',
                value: '31655847435213307464496696616'
              }
            ],
            serializer: 318720611,
            owners: [
              {
                public: {
                  serializer: 'BASE64',
                  value: 'A8qiisybzYWGnThN2beJfSQMHAHRK0WEVAeV54/rTlGp'
                },
                serializer: 547221307,
                version: 100
              }
            ],
            asset_id: {
              serializer: 'EUID',
              value: '80998'
            },
            nonce: 33595848046329,
            version: 100
          },
          {
            quantity: 1000000,
            destinations: [
              {
                serializer: 'EUID',
                value: '2718254349849692569381964675'
              }
            ],
            serializer: 318720611,
            owners: [
              {
                public: {
                  serializer: 'BASE64',
                  value: 'A+ewE2b1wj4+qiYeyex9IHNoj7xwPbqBOcIT9vonfRq4'
                },
                serializer: 547221307,
                version: 100
              }
            ],
            asset_id: {
              serializer: 'EUID',
              value: '80998'
            },
            nonce: 33595848185931,
            version: 100
          }
        ],
        operation: 'TRANSFER',
        version: 100,
        signatures: {
          '31655847435213307464496696616': {
            r: {
              serializer: 'BASE64',
              value: 'AOnzxV1UWjUiAkOXQ05RknL5v4th+Rgb2rvgPwDpUJc='
            },
            s: {
              serializer: 'BASE64',
              value: 'YPrmc4DvOv2H9Wq54ywAg8sq5URAXwFugEJ2wL0fK1Q='
            },
            serializer: -434788200,
            version: 100
          }
        }
      }
    ],
    atomsSerialized: [
      'BQAAAyEGYWN0aW9uAwAAAAVTVE9SRQxkZXN0aW5hdGlvbnMGAAAAIgcAAAAMCMh8v5Lh9xVKYQuDBwAAAAxmSRpwDnASUkqPzSgJZW5jcnlwdGVkBAAAAA9BIGdpZnQgZm9yIHlvdSEJb3BlcmF0aW9uAwAAAAhUUkFOU0ZFUglwYXJ0aWNsZXMGAAACXgUAAADFCGFzc2V0X2lkBwAAAAMBPGYMZGVzdGluYXRpb25zBgAAABEHAAAADGZJGnAOcBJSSo/NKAVub25jZQIAAAAIAAAeOrRQ7+0Gb3duZXJzBgAAAEcFAAAAQgZwdWJsaWMEAAAAIQPKoorMm82Fhp04Tdm3iX0kDBwB0StFhFQHleeP605RqQd2ZXJzaW9uAgAAAAgAAAAAAAAAZAhxdWFudGl0eQIAAAAIAAAAF0hYY4AHdmVyc2lvbgIAAAAIAAAAAAAAAGQFAAAAxQhhc3NldF9pZAcAAAADATxmDGRlc3RpbmF0aW9ucwYAAAARBwAAAAxmSRpwDnASUkqPzSgFbm9uY2UCAAAACAAAHo4klrb5Bm93bmVycwYAAABHBQAAAEIGcHVibGljBAAAACEDyqKKzJvNhYadOE3Zt4l9JAwcAdErRYRUB5Xnj+tOUakHdmVyc2lvbgIAAAAIAAAAAAAAAGQIcXVhbnRpdHkCAAAACAAAABdISSFAB3ZlcnNpb24CAAAACAAAAAAAAABkBQAAAMUIYXNzZXRfaWQHAAAAAwE8ZgxkZXN0aW5hdGlvbnMGAAAAEQcAAAAMCMh8v5Lh9xVKYQuDBW5vbmNlAgAAAAgAAB6OJJjYSwZvd25lcnMGAAAARwUAAABCBnB1YmxpYwQAAAAhA+ewE2b1wj4+qiYeyex9IHNoj7xwPbqBOcIT9vonfRq4B3ZlcnNpb24CAAAACAAAAAAAAABkCHF1YW50aXR5AgAAAAgAAAAAAA9CQAd2ZXJzaW9uAgAAAAgAAAAAAAAAZAp0aW1lc3RhbXBzBQAAABUHZGVmYXVsdAIAAAAIAAABY4QbnC0HdmVyc2lvbgIAAAAIAAAAAAAAAGQ='
    ],
    subscriberId: 1
  }
}

const atomSerialized = Buffer.from(
  atomNotification.params.atomsSerialized[0],
  'base64'
)

const atom = RadixSerializer.fromJson(
  atomNotification.params.atoms[0]
) as RadixNullAtom
