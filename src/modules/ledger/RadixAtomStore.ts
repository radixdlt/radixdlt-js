import { RadixAtom, RadixAID, RadixAddress } from '../atommodel'
import { RadixAtomNodeStatusUpdate, RadixAtomObservation } from '../..'
import { Observable } from 'rxjs'
import { RadixAtomStoreEntry } from './RadixNEDBAtomStore'


export interface RadixAtomStore {
    /**
     * Insert an Atom into the store with an intial status 
     * 
     * @param  {RadixAtom} atom The atom to insert
     * @param  {RadixAtomNodeStatusUpdate} status Status with extra data
     * @returns Promise<boolean> true if the atom didn't exist and was inserted
     */
    insert(atom: RadixAtom, status: RadixAtomNodeStatusUpdate): Promise<boolean>
    
    /**
     * Update the status of an atom in the database
     * 
     * @param  {RadixAID} aid The atom identifier
     * @param  {RadixAtomNodeStatusUpdate} status Status with extra data
     * @returns Promise<boolean> true if the atom status was changed
     */
    updateStatus(aid: RadixAID, status: RadixAtomNodeStatusUpdate): Promise<boolean>


    /**
     * Retreive a single atom from the store
     * 
     * @param  {RadixAID} aid The atom identifier
     * @returns Promise<RadixAtomObservation> the atom along with its status and a timestamp
     */
    getAtom(aid: RadixAID): Promise<RadixAtomObservation>

    
    /**
     * Get a stream of all new atom status updates
     * 
     * @param  {RadixAddress} address? Optional - Filter atoms by participant address
     * @returns Observable<RadixAtomObservation> a stream of atoms along with their status updates
     */
    getAtomObservations(address?: RadixAddress): Observable<RadixAtomObservation>

    /**
     * Get a stream of all atoms stored in the atom store
     * 
     * @param  {RadixAddress} address? Optional - Filter atoms by participant address
     * @returns  Observable<RadixAtomObservation> a stream of atoms along with their status updates
     */
    getStoredAtomObservations(address?: RadixAddress): Observable<RadixAtomObservation>

    /**
     * Get a stream of status updates for a specific atom
     * 
     * @param  {RadixAID} aid The atom identifier
     * @returns Observable<RadixAtomNodeStatusUpdate> a stream of atom status updates
     */
    getAtomStatusUpdates(aid: RadixAID): Observable<RadixAtomNodeStatusUpdate>


    /**
     * Clear all stored atoms
     * 
     * @returns Promise<boolean> true if reset was successful
     */
    reset(): Promise<boolean>
    
}
