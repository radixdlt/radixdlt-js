import { UnknownTestVector } from '../../SanityTestSuiteRoot'
import ScenarioRunner from '../../ScenarioRunner'
import { RadixParticle, RadixSerializer, sha256 } from '../../../../src'
import { expect } from 'chai'

interface JsonParticlesTestVector extends UnknownTestVector {
    expected: {
        hashOfJSON: string,
    }

    input: {
        json: object,
        metaData: {
            objectTypeSerializer: string,
            serializerFormat: string,
        },
    }
}

export default class JsonRadixParticlesTestScenarioRunner extends ScenarioRunner<JsonParticlesTestVector> {

    public identifer = 'json_radix_particles'

    public doTestVector(testVector: JsonParticlesTestVector) {
        const bundledJSONPretty: string = JSON.stringify(testVector.input.json, Object.keys(testVector.input.json).sort(), 4)
        const particle: RadixParticle = RadixSerializer.fromJSONObject(testVector.input.json)

        expect(particle.serializer).to.equal(testVector.input.metaData.objectTypeSerializer)

        const serializedJson = RadixSerializer.toJSON(particle)
        const serializedJsonPretty = JSON.stringify(serializedJson, Object.keys(serializedJson).sort(), 4)

        expect(serializedJsonPretty).to.equal(bundledJSONPretty)

        const hashOfSerializedJSON = sha256(Buffer.from(serializedJsonPretty, 'utf8'))
        const calculated = hashOfSerializedJSON.toString('hex')

        const expected = testVector.expected.hashOfJSON

        expect(calculated).to.equal(expected)
    }
}
