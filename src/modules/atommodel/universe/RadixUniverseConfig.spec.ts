import 'mocha'
import { expect } from 'chai'
import { RadixUniverseConfig, RadixSerializer } from '..'

const config = RadixUniverseConfig.LOCAL

describe('RadixUniverseConfig', () => {
    it('should generate a correct hid', () => {
        const hid = config.rawJson.hid
        const serializedHid = RadixSerializer.fromJSON(hid)
        const generatedHid = config.getHid()
        expect(serializedHid).deep.equal(generatedHid)
    })
})
