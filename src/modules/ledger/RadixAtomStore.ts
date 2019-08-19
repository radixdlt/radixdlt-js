import { RadixAtom, RadixAID, RadixAddress } from '../atommodel';
import { RadixAtomStatus, RadixAtomStatusUpdate, RadixAtomNodeStatusUpdate, } from '../..';
import { Observable } from 'rxjs';
import { RadixAtomStoreEntry } from './RadixNEDBAtomStore';


export interface RadixAtomStore {
    insert(atom: RadixAtom, status: RadixAtomNodeStatusUpdate): Promise<boolean>
    updateStatus(aid: RadixAID, status: RadixAtomNodeStatusUpdate): Promise<boolean>
    getAtom(aid: RadixAID): Promise<{
        atom: RadixAtom,
        status: RadixAtomNodeStatusUpdate,
        timestamp: number,
    }>
    getAtomObservations(address?: RadixAddress): Observable<{
        atom: RadixAtom,
        status: RadixAtomNodeStatusUpdate,
        timestamp: number,
    }>

    getStoredAtomObservations(address?: RadixAddress): Observable<{
        atom: RadixAtom,
        status: RadixAtomNodeStatusUpdate,
        timestamp: number,
    }>

    getAtomStatusUpdates(aid: RadixAID): Observable<RadixAtomNodeStatusUpdate>
}
