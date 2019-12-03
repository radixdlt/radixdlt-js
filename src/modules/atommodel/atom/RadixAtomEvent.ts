
import { RadixSerializer, RadixSerializableObject, includeJSON, includeDSON, RadixAtom } from '..'

@RadixSerializer.registerClass('api.atom_event')
export class RadixAtomEvent extends RadixSerializableObject {
    @includeJSON
    @includeDSON
    public atom: RadixAtom

    @includeJSON
    @includeDSON
    public type: string
}
