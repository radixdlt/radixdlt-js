import { Subject, Observable, Observer } from 'rxjs'
import { TSMap } from 'typescript-map'
import { filter } from 'rxjs/operators'

import RadixAccountSystem from './RadixAccountSystem'
import RadixApplicationDataUpdate from './RadixApplicationDataUpdate'
import RadixApplicationData from './RadixApplicationData'

import { RadixAtom, RadixApplicationPayloadAtom } from '../atom_model'

export default class RadixDataAccountSystem implements RadixAccountSystem {
    public name = 'DATA'

    public applicationDataSubject: Subject<
        RadixApplicationDataUpdate
    > = new Subject()
    public applicationData: TSMap<
        string,
        TSMap<string, RadixApplicationData>
    > = new TSMap()

    constructor(readonly keyPair) {}

    public async processAtom(atom: RadixAtom) {
        if (atom.serializer !== RadixApplicationPayloadAtom.SERIALIZER) {
            return
        }

        if (atom.action === 'STORE') {
            this.processStoreAtom(atom as RadixApplicationPayloadAtom)
        } else if (atom.action === 'DELETE') {
            this.processDeleteAtom(atom as RadixApplicationPayloadAtom)
        }
    }

    private processStoreAtom(atom: RadixApplicationPayloadAtom) {
        const applicationId = atom.applicationId
        const hid = atom.hid.toString()

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
            timestamp: atom.timestamps.default
        }
        const applicationDataUpdate = {
            type: 'STORE',
            hid,
            applicationId,
            data: applicationData
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

        // Skip nonexisting atoms
        if (
            !this.applicationData.has(applicationId) ||
            !this.applicationData.get(applicationId).has(hid)
        ) {
            return
        }

        const applicationData = this.applicationData.get(applicationId).get(hid)

        const applicationDataUpdate = {
            type: 'DELETE',
            hid,
            applicationId,
            data: applicationData
        }

        this.applicationData.get(applicationId).delete(hid)

        this.applicationDataSubject.next(applicationDataUpdate)
    }

    public getApplicationData(
        applicationId: string
    ): Observable<RadixApplicationDataUpdate> {
        return Observable.create(
            (observer: Observer<RadixApplicationDataUpdate>) => {
                // Send all old data
                if (this.applicationData.has(applicationId)) {
                    for (const applicationData of this.applicationData
                        .get(applicationId)
                        .values()) {
                        const applicationDataUpdate = {
                            type: 'STORE',
                            hid: applicationData.hid,
                            applicationId,
                            data: applicationData
                        }

                        this.applicationDataSubject.next(applicationDataUpdate)
                    }
                }

                // Subscribe for new ones
                this.applicationDataSubject
                    .pipe(
                        filter(update => {
                            return update.applicationId === applicationId
                        })
                    )
                    .subscribe(observer)
            }
        )
    }
}
