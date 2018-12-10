import RadixNodeConnection from '../universe/RadixNodeConnection'
import RadixPOWTask from '../pow/RadixPOWTask'
import RadixUtil from '../common/RadixUtil'
import { RadixTokenClassReference, RadixAtom, RadixFeeParticle, RadixAddress } from '../atommodel';
import BN from 'bn.js'


export default class RadixFeeProvider {
    public static async generatePOWFee(
        magic: number,
        token: RadixTokenClassReference,
        atom: RadixAtom,
        recipient: RadixAddress,
    ) {
        // Compute difficulty, make a target buffer with first n bits set to 0
        const target = RadixUtil.powTargetFromAtomSize(atom.getSize())

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
            Date.now() * 60000,
        )

        return feeParticle
    }
}
