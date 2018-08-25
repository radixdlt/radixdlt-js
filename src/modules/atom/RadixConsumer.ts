import RadixConsumable from './RadixConsumable'

export default class RadixConsumer extends RadixConsumable {
  public static SERIALIZER = 214856694

  constructor(json?: object) {
    super(json)
  }
}
