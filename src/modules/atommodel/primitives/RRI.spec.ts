
import { expect } from 'chai'
import 'mocha'
import { RadixAddress } from './RadixAddress'
import { RRI } from './RRI'
import { RadixSerializer } from '..'

describe(`RRI`, () => {

    const address = RadixAddress.fromAddress('JHnGqXsMZpTuGwt1kU92mSpKasscJzfkkZJHe2vaEvBM3jJiVBq')
    const rri = new RRI(address, 'test')
    const json = `:rri:/${address.toString()}/test`

    it(`should be able to be deserialzed from JSON`, () => {
        const rriFromJSON: RRI = RadixSerializer.fromJSON(json)
        expect(rriFromJSON.toString()).to.equal(rri.toString())
    })
})
