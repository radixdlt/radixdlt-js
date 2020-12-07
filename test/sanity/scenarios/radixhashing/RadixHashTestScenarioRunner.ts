import { UnknownTestVector } from '../../SanityTestSuiteRoot'
import ScenarioRunner from '../../ScenarioRunner'
import { radixHash } from '../../../../src'
import { expect } from 'chai'

interface RadixHashingTestVector extends UnknownTestVector {
    expected: {
        hashOfHash: string,
    }

    input: {
        stringToHash: string,
    }
}

export default class RadixHashTestScenarioRunner extends ScenarioRunner<RadixHashingTestVector> {

    public identifer = 'radix_hashing'

    public doTestVector(testVector: RadixHashingTestVector) {
        const expected = testVector.expected.hashOfHash
        const stringToHash = Buffer.from(testVector.input.stringToHash, 'utf8')
        const calculated = radixHash(stringToHash).toString('hex')
        expect(calculated).to.equal(expected)
    }
}
