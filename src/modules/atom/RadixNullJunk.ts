import RadixParticle from './RadixParticle'
import RadixBase64 from '../common/RadixBASE64'

export default class RadixNullJunk extends RadixParticle {
  public static SERIALIZER = -1123054001

  public junk: RadixBase64

  constructor(json?: object) {
    super(json)

    this.serializationProperties.push('junk')
  }
}
