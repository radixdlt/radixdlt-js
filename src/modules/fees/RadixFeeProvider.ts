import RadixNodeConnection from '../node/RadixNodeConnection';
import RadixAtom from '../atom/RadixAtom';
import RadixPOWTask from '../pow/RadixPOWTask';
import RadixUtil from '../common/RadixUtil';
import RadixAtomFeeConsumable from './RadixAtomFeeConsumable';
import RadixKeyPair from '../wallet/RadixKeyPair';
import RadixECKeyPair from '../atom/RadixECKeyPair';
import RadixAsset from '../assets/RadixAsset';
import RadixConsumable from '../atom/RadixConsumable';

export default class RadixFeeProvider {

    public static async generatePOWFee(magic: number, asset: RadixAsset, atom: RadixAtom, endorsee: RadixNodeConnection) {
        const endorseePublicKey: any = (endorsee.node.system) ? endorsee.node.system.key.data : 'undefined'
        //Compute difficulty, make a target buffer with first n bits set to 0
        const target = RadixUtil.powTargetFromAtomSize(atom.getSize())

        //Make seed
        const seed = atom.getHash()

        const powTask = new RadixPOWTask(magic, seed, target)
        const pow = await powTask.computePow()

        //Make AtomFeeConsumable
        const feeConsumable = new RadixAtomFeeConsumable()
        //Asset
        feeConsumable.asset_id = asset.id
        feeConsumable.quantity = pow.nonce.toNumber()
        feeConsumable.nonce = Date.now()
        feeConsumable.owners = [RadixECKeyPair.fromRadixKeyPair(RadixKeyPair.fromPublic(endorseePublicKey))]

        return feeConsumable
    }
}
