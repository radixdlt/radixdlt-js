import BN from 'bn.js'

import RadixNodeConnection from '../universe/RadixNodeConnection'
import RadixPOWTask from '../pow/RadixPOWTask'
import { RadixTokenClassReference, RadixAtom, RadixFeeParticle, RadixAddress, RadixSerializer } from '../atommodel'
import { powTargetFromAtomSize } from '../..'


export default class RadixFeeProvider {
    public static async generatePOWFee(
        magic: number,
        token: RadixTokenClassReference,
        atom: RadixAtom,
        recipient: RadixAddress,
    ) {

        // Compute difficulty, make a target buffer with first n bits set to 0
        // const target = powTargetFromAtomSize(atom.getSize())
        const target = Buffer.from('0000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF', 'hex')

        // Make seed
        const seed = atom.getHash()

        // POW
        const powTask = new RadixPOWTask(magic, seed, target)
        const pow = await powTask.computePow()

        const feeParticle = new RadixFeeParticle(
            new BN(pow.nonce.toString(16), 16),
            recipient,
            Date.now(),
            token,
            Math.floor(Date.now() / 60000 + 60000),
        )

        return feeParticle
    }
}
