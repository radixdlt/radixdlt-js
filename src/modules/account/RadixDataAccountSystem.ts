import { Subject, Observable, Observer } from 'rxjs'
import { TSMap } from 'typescript-map'
import { filter } from 'rxjs/operators'

import RadixAccountSystem from './RadixAccountSystem'
import RadixApplicationDataUpdate from './RadixApplicationDataUpdate'
import RadixApplicationData from './RadixApplicationData'
import RadixKeyPair from '../wallet/RadixKeyPair'

import { RadixAtom, RadixApplicationPayloadAtom, RadixAtomUpdate } from '../RadixAtomModel'

export default class RadixDataAccountSystem implements RadixAccountSystem {
    public name = 'DATA'
    public applicationDataSubject: Subject<RadixApplicationDataUpdate> = new Subject()
    public applicationData: TSMap<string, TSMap<string, RadixApplicationData>> = new TSMap()

    constructor(readonly keyPair) {}

    public async processAtomUpdate(atomUpdate: RadixAtomUpdate) {
        if (atomUpdate.atom.serializer !== RadixApplicationPayloadAtom.SERIALIZER) {
            return
        }

        if (atomUpdate.action === 'STORE') {
            this.processStoreAtom(atomUpdate.atom as RadixApplicationPayloadAtom)
        } else if (atomUpdate.action === 'DELETE') {
            this.processDeleteAtom(atomUpdate.atom as RadixApplicationPayloadAtom)
        }
    }

    private processStoreAtom(atom: RadixApplicationPayloadAtom) {
        const applicationId = atom.applicationId
        const hid = atom.hid.toString()
        const signatures = atom.signatures

        // Skip existing atoms
        if (
            this.applicationData.has(applicationId) &&
            this.applicationData.get(applicationId).has(hid)
        ) {
            return
        }

        const applicationData = {
            hid,
            payload: '',
            timestamp: atom.timestamps.default,
            signatures,
        }
        
        const applicationDataUpdate = {
            action: 'STORE',
            hid,
            applicationId,
            data: applicationData,
            signatures,
        }

        if (atom.payload === null) {
            return
        }

        applicationData.payload = atom.payload

        if (!this.applicationData.has(applicationId)) {
            this.applicationData.set(applicationId, new TSMap())
        }

        this.applicationData.get(applicationId).set(hid, applicationData)
        this.applicationDataSubject.next(applicationDataUpdate)
    }

    private processDeleteAtom(atom: RadixApplicationPayloadAtom) {
        const applicationId = atom.applicationId
        const hid = atom.hid.toString()
        const signatures = atom.signatures

        // Skip nonexisting atoms
        if (
            !this.applicationData.has(applicationId) ||
            !this.applicationData.get(applicationId).has(hid)
        ) {
            return
        }

        const applicationData = this.applicationData.get(applicationId).get(hid)

        const applicationDataUpdate = {
            action: 'DELETE',
            hid,
            applicationId,
            data: applicationData,
            signatures,
        }

        this.applicationData.get(applicationId).delete(hid)
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
        const signatureIds = !addresses ? undefined : addresses.map(a => RadixKeyPair.fromAddress(a).getUID().toString())
        
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
                                hid: applicationData.hid,
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
