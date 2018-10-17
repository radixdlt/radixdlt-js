import RadixECIES from './RadixECIES'

import { RadixBasicContainer, RadixBase64, RadixKeyPair } from '../RadixAtomModel'
import { logger } from '../common/RadixLogger'

export default class RadixEncryptor extends RadixBasicContainer {
    static SERIALIZER = 105401064

    protectors: Array<RadixBase64>

    constructor(json?: object) {
        super(json)

        this.serializationProperties.push('protectors')
    }

    getKey(accessor: RadixKeyPair): Buffer {
        for (let protector of this.protectors) {
            try {
                let decryptedPrivateKey = RadixECIES.decrypt(
                    accessor.keyPair.getPrivate(),
                    protector.data
                )
                return decryptedPrivateKey
            } catch (error) {
                logger.error('Couldn\'t decrypt:', error)
            }
        }

        throw new Error('Could not decrypt any protectors')
    }

    decrypt(data: RadixBase64, accessor: RadixKeyPair) {
        let privateKey = this.getKey(accessor)

        return RadixECIES.decrypt(privateKey, data.data)
    }
}
