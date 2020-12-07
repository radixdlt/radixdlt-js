import { UnknownTestVector } from './SanityTestSuiteRoot'

export default abstract class ScenarioRunner<TestVector extends UnknownTestVector> {
    public abstract identifer: string
    public abstract doTestVector(testVector: TestVector)
}
