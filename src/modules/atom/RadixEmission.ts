

import {RadixConsumable} from '../atom_model'

export default class RadixEmission extends RadixConsumable {
  public static SERIALIZER = 1782261127

  constructor(json?: object) {
    super(json)
  }
}
