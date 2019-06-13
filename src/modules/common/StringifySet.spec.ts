import { expect } from 'chai'
import 'mocha'
import { StringifySet } from './StringifySet';


class TestStringObject {
    constructor(readonly s: string) {
        //
    }

    public toString() {
        return this.s
    }
}


describe('StringifySet', () => {
    it('should add multiple items individually', () => {
        const set = new StringifySet<TestStringObject>()

        const s1 = new TestStringObject('t1')
        const s2 = new TestStringObject('t2')

        set.add(s1)
        set.add(s2)

        expect(set.values()).to.deep.equal([s1, s2])
    })

    it('should add multiple items at once', () => {
        const set = new StringifySet<TestStringObject>()

        const s1 = new TestStringObject('t1')
        const s2 = new TestStringObject('t2')

        set.addAll([s1, s2])

        expect(set.values()).to.deep.equal([s1, s2])
    })

    it('should preserve order', () => {
        const set = new StringifySet<TestStringObject>()

        const s1 = new TestStringObject('t1')
        const s2 = new TestStringObject('t2')

        set.addAll([s2, s1])

        expect(set.values()).to.deep.equal([s2, s1])
    })

    it('should only add non-unique items once', () => {
        const set = new StringifySet<TestStringObject>()

        const s1 = new TestStringObject('t1')
        const s2 = new TestStringObject('t2')
        const s3 = new TestStringObject('t2')

        set.addAll([s1, s2, s3])

        expect(set.values()).to.deep.equal([s1, s2])
    })

    it('should remove items', () => {
        const set = new StringifySet<TestStringObject>()

        const s1 = new TestStringObject('t1')
        const s2 = new TestStringObject('t2')

        set.addAll([s1, s2])
        set.remove(s1)

        expect(set.values()).to.deep.equal([s2])
    })
})
