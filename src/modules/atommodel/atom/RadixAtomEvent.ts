
import { RadixSerializer, RadixSerializableObject, includeJSON, includeDSON, RadixAtom } from '..';

@RadixSerializer.registerClass('ATOMEVENT')
export class RadixAtomEvent extends RadixSerializableObject {
    @includeJSON
    @includeDSON
    public atom: RadixAtom

    @includeJSON
    @includeDSON
    public type: string
}
