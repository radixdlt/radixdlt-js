import testSanitySuiteJson from './sanity_test_suite.json'

import 'mocha'
import { expect } from 'chai'

import { failDescriptionForTestScenario, SanityTestScenario, UnknownTestVector } from './SanityTestSuiteRoot'
import { logger, sha256 } from '../../src'
import ScenarioRunner from './ScenarioRunner'
import HashTestScenarioRunner from './scenarios/hashing/HashTestScenarioRunner'
import RadixHashTestScenarioRunner from './scenarios/radixhashing/RadixHashTestScenarioRunner'
import { AssertionError } from 'assert'
import JsonRadixParticlesTestScenarioRunner from './scenarios/jsonparticles/JsonRadixParticlesTestScenarioRunner'

const executeTestScenario = (testScenario: SanityTestScenario, runner: ScenarioRunner<UnknownTestVector>): void => {
    testScenario.tests.vectors.forEach((testVector, index) => {
        try {
            logger.debug(`🧩 Running vector at index ${index}`)
            runner.doTestVector(testVector)
            logger.debug(`🧩☑️ Vector at index ${index} PASSED`)
        } catch (error) {
            const errorMsg = `Failing test vector index: ${index}, vector: ${testVector}`
            throw new Error(`${errorMsg}, error: ${error}`)
        }
    })
}

describe(`sanity test suite`, function() {

    it(`passes all scenarios`, function() {
        logger.setLevel('info')

        const replacer = (key, value) =>
            value instanceof Object && !(value instanceof Array) ?
                Object.keys(value)
                    .sort()
                    .reduce((sorted, key) => {
                        sorted[key] = value[key];
                        return sorted
                    }, {}) :
                value;

        const suiteAsJSONString = JSON.stringify(testSanitySuiteJson.suite, replacer, 4)



        const calculated = sha256(Buffer.from(suiteAsJSONString, 'utf8')).toString('hex')
        const expected = testSanitySuiteJson.hashOfSuite
        expect(calculated).to.equal(expected)

        const runners: Array<ScenarioRunner<UnknownTestVector>> = [
            new HashTestScenarioRunner(),
            new RadixHashTestScenarioRunner(),
            new JsonRadixParticlesTestScenarioRunner(),
        ]

        const scenarioIdentifierToRunnerMap = runners.reduce(function(map, runner) {
            map[runner.identifer] = runner
            return map
        }, {})

        const scenarios: SanityTestScenario[] = testSanitySuiteJson.suite.scenarios

        // When all test scenarios are implemented we should uncomment the line below (and delete this comment...)!
        // expect(runners.length).to.equal(scenarios.length)

        for (const scenario of scenarios) {
            const runner = scenarioIdentifierToRunnerMap[scenario.identifier]
            if (!runner) {
                logger.error(`☢️ WARNING! No runner for test suite scenario ${scenario.identifier} was found. This is terribly bad.`)
                continue
            }
            logger.info(`🔮 Running test scenario: ${scenario.identifier}`)
            try {
                executeTestScenario(scenario, runner)
            } catch (error) {
                const failDebugInfo = failDescriptionForTestScenario(scenario, error)
                logger.error(failDebugInfo)
                throw new AssertionError({ message: failDebugInfo })
            }
            logger.info(`✅ Test scenario: ${scenario.identifier} PASSED`)
        }
    })
})
