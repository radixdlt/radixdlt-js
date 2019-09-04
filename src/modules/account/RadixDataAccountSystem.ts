import { Subject, Observable, Observer } from 'rxjs'
import { TSMap } from 'typescript-map'
import { filter } from 'rxjs/operators'

import RadixAccountSystem from './RadixAccountSystem'
import RadixApplicationDataUpdate from './RadixApplicationDataUpdate'
import RadixApplicationData from './RadixApplicationData'

import { RadixAtom, RadixAtomUpdate, RadixAddress, RadixSpin } from '../atommodel'
import { RadixAtomObservation, RadixAtomStatusIsInsert } from '../..';

export default class RadixDataAccountSystem implements RadixAccountSystem {
    public name = 'DATA'
    public applicationDataSubject: Subject<RadixApplicationDataUpdate> = new Subject()
    public applicationData: TSMap<string, TSMap<string, RadixApplicationData>> = new TSMap()

    constructor(readonly address: RadixAddress) {}

    public async processAtomUpdate(atomUpdate: RadixAtomObservation) {
        if (!('decryptedData' in atomUpdate.processedData)) {
            return
        }

        if (RadixAtomStatusIsInsert[atomUpdate.status.status]) {
            this.processStoreAtom(atomUpdate)
        } else {
            this.processDeleteAtom(atomUpdate)
        }
    }

    private processStoreAtom(atomUpdate: RadixAtomObservation) {
        const atom = atomUpdate.atom
        const aid = atom.getAidString()
        const signatures = atom.signatures
        const applicationId = atomUpdate.processedData.decryptedData.application        

        // Skip existing atoms
        if (
            this.applicationData.has(applicationId) &&
            this.applicationData.get(applicationId).has(aid)
        ) {
            return
        }

        const applicationData = {
            aid,
            payload: atomUpdate.processedData.decryptedData,
            timestamp: atom.getTimestamp(),
            signatures,
        }
        
        const applicationDataUpdate = {
            action: 'STORE',
            aid,
            applicationId,
            data: applicationData,
            signatures,
        }

        if (!this.applicationData.has(applicationId)) {
            this.applicationData.set(applicationId, new TSMap())
        }

        this.applicationData.get(applicationId).set(aid, applicationData)
        this.applicationDataSubject.next(applicationDataUpdate)
    }

    private processDeleteAtom(atomUpdate: RadixAtomObservation) {
        const atom = atomUpdate.atom
        const aid = atom.getAidString()
        const signatures = atom.signatures
        const applicationId = atomUpdate.processedData.decryptedData.application
       

        // Skip nonexisting atoms
        if (
            !this.applicationData.has(applicationId) ||
            !this.applicationData.get(applicationId).has(aid)
        ) {
            return
        }

        const applicationData = this.applicationData.get(applicationId).get(aid)

        const applicationDataUpdate = {
            action: 'DELETE',
            aid,
            applicationId,
            data: applicationData,
            signatures,
        }

        this.applicationData.get(applicationId).delete(aid)
        this.applicationDataSubject.next(applicationDataUpdate)
    }
    /**
     * Gets application data messages by application id and optionally by signer
     * 
     * @param applicationId - Application id of the payload atoms
     * @param [addresses] - List of account addreses to filter application messages by signer
     * @returns An observable subscribed to old and new application messages that met the filter requirements
     */
    public getApplicationData(applicationId: string, addresses?: string[]): Observable<RadixApplicationDataUpdate> {
        // Pre-calculate signatureIds
        const signatureIds = !addresses ? undefined : addresses.map(a => RadixAddress.fromAddress(a).getUID().toString())
        
        return Observable.create(
            (observer: Observer<RadixApplicationDataUpdate>) => {

                // Send all old data
                if (this.applicationData.has(applicationId)) {
                    for (const applicationData of this.applicationData
                        .get(applicationId)
                        .values()) {

                        if (!signatureIds 
                            || signatureIds.length === 0
                            || signatureIds.some(s => Object.keys(applicationData.signatures).includes(s))) {

                            const applicationDataUpdate = {
                                action: 'STORE',
                                aid: applicationData.aid,
                                applicationId,
                                data: applicationData,
                                signatures: applicationData.signatures,
                            }
    
                            observer.next(applicationDataUpdate)
                        }
                    }
                }

                // Subscribe for new ones
                this.applicationDataSubject
                    .pipe(
                        filter(update => {
                            return update.applicationId === applicationId 
                                && (!signatureIds 
                                    || signatureIds.length === 0
                                    || signatureIds.some(s => Object.keys(update.signatures).includes(s)))
                        })
                    )
                    .subscribe(observer)
            }
        )
    }
}
