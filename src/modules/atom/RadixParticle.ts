import RadixEUID from '../common/RadixEUID'
import RadixSignature from './RadixSignature'
import RadixBasicContainer from './RadixBasicContainer'
import RadixECKeyPair from './RadixECKeyPair'

export default abstract class RadixParticle extends RadixBasicContainer {
  public static SERIALIZER: number

  action: string
  destinations: Array<RadixEUID>
  owners: Array<RadixECKeyPair>
  serializer: number
  signatures: { [id: string]: RadixSignature }

  constructor(json?: object) {
    super(json)

    this.serializationProperties.push('action')
    this.serializationProperties.push('destinations')
    this.serializationProperties.push('owners')
  }
}
