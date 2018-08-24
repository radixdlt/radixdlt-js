import RadixAtom from './RadixAtom'
import RadixBASE64 from '../common/RadixBASE64';
import RadixPayloadAtom from './RadixPayloadAtom';

export default class RadixTransactionAtom extends RadixPayloadAtom {
    public static SERIALIZER = -760130

    public operation: string

    constructor(json?: object) {
        super(json)

        this.serializationProperties.push('operation')
    }

}
