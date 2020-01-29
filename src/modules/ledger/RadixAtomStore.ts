/*
 * (C) Copyright 2020 Radix DLT Ltd
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the “Software”),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

import { RadixAtom, RadixAID, RadixAddress } from '../atommodel';
import { RadixAtomNodeStatusUpdate, RadixAtomObservation, } from '../..';
import { Observable } from 'rxjs';
import { RadixAtomStoreEntry } from './RadixNEDBAtomStore';


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
