

import {RadixAtom} from '../atom_model'

export default class RadixNullAtom extends RadixAtom {
  public static SERIALIZER = -1123323048

  constructor(json?: object) {
    super(json)
  }
}
