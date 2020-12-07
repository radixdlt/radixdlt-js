import { UnknownTestVector } from '../../SanityTestSuiteRoot'
import { sha256 } from '../../../../src'
import { expect } from 'chai'
import ScenarioRunner from '../../ScenarioRunner'

interface HasingTestVector extends UnknownTestVector {
    expected: {
        hash: string,
    }

    input: {
        stringToHash: string,
    }
}

export default class HashTestScenarioRunner extends ScenarioRunner<HasingTestVector> {

    public identifer = 'hashing'

    public doTestVector(testVector: HasingTestVector) {
        const expected = testVector.expected.hash
        const stringToHash = Buffer.from(testVector.input.stringToHash, 'utf8')
        const calculated = sha256(stringToHash).toString('hex')
        expect(calculated).to.equal(expected)
    }
}
