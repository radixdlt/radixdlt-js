import { AssertionError } from 'assert'

export interface UnknownTestVector {
    input: object
    expected: object
}

export interface ToolInfo {
    name: string
    link: string
    version: string
}

export interface ModifiedByTool {
    expression: string
    tool: ToolInfo
}

export interface TestSource {
    link?: string
    comment?: string
    originalSourceLink?: string
    modifiedByTool?: ModifiedByTool
}

export interface SanityTestScenarioDescription {
    implementationInfo: string
    purpose: string
    troubleshooting: string
}

export interface SanityTestScenarioTests {
    source: TestSource
    vectors: UnknownTestVector[]
}

export interface SanityTestScenario {
    description: SanityTestScenarioDescription
    name: string
    identifier: string
    tests: SanityTestScenarioTests
}

export const failDescriptionForTestScenario = (failedTestScenario: SanityTestScenario, testAssertionError: AssertionError): string => {
    return `
        ⚠️⚠️⚠️
        Failed test scenario: ${failedTestScenario.name},
        Identifier: ${failedTestScenario.identifier},
        Purpose of scenario: ${failedTestScenario.description.purpose},
        Troubleshooting: ${failedTestScenario.description.troubleshooting},
        Implementatoin info: ${failedTestScenario.description.implementationInfo},
        Test vectors found at: ${failedTestScenario.tests.source.link},
        Test vectors modified?: ${failedTestScenario.tests.source.modifiedByTool ? 'YES' : 'NO' },
        Failure reason: ${testAssertionError.message}
        ⚠️⚠️⚠️
    `
}

export interface SanityTestSuite {
    scenarios: SanityTestScenario[]
}

export interface SanityTestSuiteRoot {
    hashOfSuite: string
    suite: SanityTestSuite
}
