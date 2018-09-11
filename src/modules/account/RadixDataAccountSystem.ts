import RadixAccountSystem from './RadixAccountSystem';
import RadixAtom from '../atom/RadixAtom';
import RadixApplicayionPayloadAtom from '../atom/RadixApplicationPayloadAtom';
import { Subject, Observable, Observer } from 'rxjs';
import { TSMap } from 'typescript-map';
import RadixApplicationDataUpdate from './RadixApplicationDataUpdate';
import RadixApplicationData from './RadixApplicationData';
import { filter } from 'rxjs/operators';

export default class RadixDataAccountSystem implements RadixAccountSystem {
    // TODO extract interfaces
    public applicationDataSubject: Subject<RadixApplicationDataUpdate> = new Subject()


    public applicationData: TSMap<string, TSMap<string, RadixApplicationData>> = new TSMap()


    constructor(readonly keyPair) {
        //
    }
    
    
    public processAtom(atom: RadixAtom) {
        if (atom.serializer !== RadixApplicayionPayloadAtom.SERIALIZER) {
            return
        }

        if (atom.action === 'STORE') {
            this.processStoreAtom(atom as RadixApplicayionPayloadAtom)
        } else if (atom.action === 'DELETE') {
            this.processDeleteAtom(atom as RadixApplicayionPayloadAtom)
        }
    }


    private processStoreAtom(atom: RadixApplicayionPayloadAtom) {
        const applicationId = atom.applicationId
        const hid = atom.hid.toString()        

        const applicationData = {
            hid,
            payload: '',
            timestamp: atom.timestamps.default,
        }
        const applicationDataUpdate = {
            type: 'STORE',
            hid,
            applicationId,
            data: applicationData,
        }

        try {
            applicationData.payload = atom.getDecryptedPayload(this.keyPair)
        } catch (e) {
            console.error('Failed to decrypt application payload atom', atom)
            return
        }
      
        if (!this.applicationData.has(applicationId)) {
            this.applicationData.set(applicationId, new TSMap())
        }
      
        this.applicationData
            .get(applicationId)
            .set(hid, applicationData)
      
        this.applicationDataSubject.next(applicationDataUpdate)
    }


    private processDeleteAtom(atom: RadixApplicayionPayloadAtom) {
        const applicationId = atom.applicationId
        const hid = atom.hid.toString()
        const applicationData = this.applicationData.get(applicationId).get(hid)

        const applicationDataUpdate = {
            type: 'DELETE',
            hid,
            applicationId,
            data: applicationData,
        }

        this.applicationData.get(applicationId).delete(hid)

        this.applicationDataSubject.next(applicationDataUpdate)
    }





    public getApplicationData(applicationId: string): Observable<RadixApplicationDataUpdate> {
        return Observable.create(
            (observer: Observer<RadixApplicationDataUpdate>) => {
                // Send all old data
                if (this.applicationData.has(applicationId)) {
                    for (const applicationData of this.applicationData.get(applicationId).values()) {
                        const applicationDataUpdate = {
                            type: 'STORE',
                            hid: applicationData.hid,
                            applicationId,
                            data: applicationData,
                        }

                        this.applicationDataSubject.next(applicationDataUpdate)
                    }                
                }
        
                // Subscribe for new ones
                this.applicationDataSubject.pipe(filter((update) => {
                    return update.applicationId === applicationId
                })).subscribe(observer)

            },
        )
    }
}
