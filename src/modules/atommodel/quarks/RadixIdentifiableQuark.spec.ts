import 'mocha'
import { expect } from 'chai'

import {
    RadixUniqueQuark,
    RadixAddress,
    RadixFungibleType,
    RadixParticleIndex,
    RadixResourceIdentifier,
} from '..'

import { RadixIdentifiableQuark } from './RadixIdentifiableQuark'

describe('RadixIdentifiableQuark', () => {

    {
        const rri = new RadixResourceIdentifier(RadixAddress.generateNew(), 'test', 'test2')
        const quark = new RadixIdentifiableQuark(rri)

        it(`should compute hid`, () => {
            expect(quark.getHID.bind(quark)).to.not.throw()
        })
    }
    
})
