import RadixParticle from './RadixParticle'
import RadixBASE64 from '../common/RadixBASE64'

export default class RadixNullJunk extends RadixParticle {
  public static SERIALIZER = -1123054001

  public junk: RadixBASE64

  constructor(json?: object) {
    super(json)

    this.serializationProperties.push('junk')
  }
}
