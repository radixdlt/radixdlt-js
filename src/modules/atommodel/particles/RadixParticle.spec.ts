import 'mocha'
import { expect } from 'chai'

import { RadixAddress } from '../primitives/RadixAddress'
import { RadixMessageParticle } from '../particles/data/RadixMessageParticle'

describe('RadixParticle', () => {

    {
        const particle = new RadixMessageParticle(RadixAddress.generateNew(), RadixAddress.generateNew(), '', {})

        it(`should compute hid`, () => {
            expect(particle.getHID.bind(particle)).to.not.throw()
        })
    }

})
