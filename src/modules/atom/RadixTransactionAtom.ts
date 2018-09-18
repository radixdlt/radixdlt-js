import {RadixPayloadAtom,
    } from '../atom_model'

export default class RadixTransactionAtom extends RadixPayloadAtom {
  public static SERIALIZER = -760130

  public operation: string

  constructor(json?: object) {
    super(json)

    this.serializationProperties.push('operation')
  }
}
