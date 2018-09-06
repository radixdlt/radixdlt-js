import RadixNodeConnection from '../universe/RadixNodeConnection'
import RadixAtom from '../atom/RadixAtom'
import RadixPOWTask from '../pow/RadixPOWTask'
import RadixUtil from '../common/RadixUtil'
import RadixAtomFeeConsumable from './RadixAtomFeeConsumable'
import RadixKeyPair from '../wallet/RadixKeyPair'
import RadixECKeyPair from '../atom/RadixECKeyPair'
import RadixTokenClass from '../token/RadixTokenClass'

export default class RadixFeeProvider {
  public static async generatePOWFee(
    magic: number,
    token: RadixTokenClass,
    atom: RadixAtom,
    endorsee: RadixNodeConnection,
  ) {
    const endorseePublicKey = endorsee.node.system.key.data

    // Compute difficulty, make a target buffer with first n bits set to 0
    const target = RadixUtil.powTargetFromAtomSize(atom.getSize())

    // Make seed
    const seed = atom.getHash()

    // POW
    const powTask = new RadixPOWTask(magic, seed, target)
    const pow = await powTask.computePow()

    // Make AtomFeeConsumable
    const feeConsumable = new RadixAtomFeeConsumable()

    // Token
    feeConsumable.asset_id = token.id
    feeConsumable.quantity = pow.nonce.toNumber()
    feeConsumable.nonce = Date.now()
    feeConsumable.owners = [
      RadixECKeyPair.fromRadixKeyPair(RadixKeyPair.fromPublic(endorseePublicKey))
    ]

    return feeConsumable
  }
}
