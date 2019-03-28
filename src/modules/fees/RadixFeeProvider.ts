import BN from 'bn.js'

import RadixNodeConnection from '../universe/RadixNodeConnection'
import RadixPOWTask from '../pow/RadixPOWTask'
import { RadixTokenDefinitionReference, RadixAtom, RadixAddress, RadixSerializer } from '../atommodel'
import { powTargetFromAtomSize, RadixPOW } from '../..'


export default class RadixFeeProvider {
    /**
     * Compute a valid POW nonce for an atom
     * 
     * @param  {number} universeMagicNumber A universe-specific number defined in the unvierse config
     * @param  {RadixAtom} atom The atom without a pow fee
     * @returns Promise
     */
    
    public static async generatePOWFee(
        universeMagicNumber: number,
        atom: RadixAtom,
    ): Promise<RadixPOW> {

        // Compute difficulty, make a target buffer with first n bits set to 0
        // const target = powTargetFromAtomSize(atom.getSize())
        const target = Buffer.from('0000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF', 'hex')

        // Make seed
        const seed = atom.getHash()

        // POW
        const powTask = new RadixPOWTask(universeMagicNumber, seed, target)
        const pow = await powTask.computePow()

        return pow
    }
}
