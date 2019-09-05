import { RadixAtom } from '../atommodel'
import { RadixAtomNodeStatusUpdate } from '../..'

export interface RadixAtomObservation {
    atom: RadixAtom,
    status: RadixAtomNodeStatusUpdate,
    timestamp: number,
    processedData?: {[key: string]: any},
}
