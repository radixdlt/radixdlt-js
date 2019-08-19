import { RadixAtomStore, RadixAtom, RadixAtomNodeStatusUpdate, RadixAID, RadixAddress, RadixAtomNodeStatus } from '../..';
import { Observable, Subject } from 'rxjs';
import Datastore from 'nedb'
import { RadixSerializer } from '../atommodel';


export interface RadixAtomStoreEntry {
    _id: string,
    atom: any,
    status: RadixAtomNodeStatusUpdate,
    addresses: string[],
    createdAt?: number,
    updatedAt?: number,
}

export class RadixNEDBAtomStore implements RadixAtomStore {
    

    private db: Datastore
    private atomObservationSubject = new Subject<{ atom: RadixAtom; status: RadixAtomNodeStatusUpdate; timestamp: number; }>()

    /**
     * Creates an instance of radix nedbatom cache.
     * @param filename File path on disk in Node, path in localStorage in the browser
     */
    constructor(options: {
        filename?: string,
        inMemoryOnly?: boolean,
    }) {
        (options as any).autoload = true;
        (options as any).timestampData = true

        this.db = new Datastore(options)
    }
    
    public insert(atom: RadixAtom, status: RadixAtomNodeStatusUpdate): Promise<boolean> {
        return this.dbNotExists(atom.getAidString()).then(() => {
            const dbEntry: RadixAtomStoreEntry = {
                _id: atom.getAidString(),
                atom: atom.toJSON(),
                status,
                addresses: atom.getAddresses().map(address => address.toString()),
            }

            return this.dbInsert(dbEntry)
        }).then((newDoc: RadixAtomStoreEntry) => {
            this.atomObservationSubject.next({
                atom,
                status,
                timestamp: newDoc.updatedAt,
            })

            return true
        }).catch(error => {
            return false
        })
    }    
    
    public updateStatus(aid: RadixAID, status: RadixAtomNodeStatusUpdate): Promise<boolean> {
        return this.dbFindOne(aid.toString()).then(atomEntry => {
            if (atomEntry.status.status === status.status) {
                throw new Error('No change')
            }

            this.dbUpdate(aid.toString(), status).then(() => {
                this.atomObservationSubject.next({
                    atom: RadixSerializer.fromJSON(atomEntry.atom),
                    status,
                    timestamp: atomEntry.updatedAt,
                })
            })

            return true
        })
        .catch(error => {
            return false
        })

    }


    public getAtom(aid: RadixAID): Promise<{ atom: RadixAtom; status: RadixAtomNodeStatusUpdate; timestamp: number; }> {
        return this.dbFindOne(aid.toString()).then(atomEntry => {
            return {
                atom: RadixSerializer.fromJSON(atomEntry.atom),
                status: atomEntry.status,
                timestamp: atomEntry.updatedAt,
            }
        })
    }


    public getAtomObservations(address?: RadixAddress): Observable<{ atom: RadixAtom; status: RadixAtomNodeStatusUpdate; timestamp: number; }> {
        return this.atomObservationSubject.filter(atomObservation => {
            if (address) {
                for (const atomAddress of atomObservation.atom.getAddresses()) {
                    if (address.equals(atomAddress)) {
                        return true
                    }
                }

                return false
            } else {
                return true
            }
        }).share()
    }


    public getAtomStatusUpdates(aid: RadixAID): Observable<RadixAtomNodeStatusUpdate> {
        return this.atomObservationSubject.filter((atomObservation) => {
            return atomObservation.atom.getAid().equals(aid)
        }).map(atomObservation => {
            return atomObservation.status
        }).share()
    }
    

    public getStoredAtomObservations(address?: RadixAddress): Observable<{ atom: RadixAtom; status: RadixAtomNodeStatusUpdate; timestamp: number; }> {
        const query = {}

        if (address) {
            (query as any).addresses = address
        }

        return Observable.create(observer => {
            this.dbFind(query).then(async entires => {
                for (const entry of entires) {
                    const deserializedAtom = await this.asyncDeserialize(entry.atom)
    
                    observer.next({
                        atom: deserializedAtom,
                        status: entry.status,
                        timestamp: entry.updatedAt,
                    })
                }
            })
        })
    }


    private asyncDeserialize(atom) {
        return new Promise<RadixAtom>((resolve, reject) => {
            setTimeout(() => {
                resolve(RadixSerializer.fromJSON(atom))
            }, 0)
        })
    }




    // Promise wrappers for nedb
    private dbFindOne = (_id: string): Promise<RadixAtomStoreEntry> => {
        return new Promise((resolve, reject) => {
            this.db.findOne<RadixAtomStoreEntry>({_id}, (error, doc) => {
                if (error) {
                    reject(error)
                } else {
                    resolve(doc)
                }
            })
        })
    }

    private dbNotExists = (_id: string): Promise<boolean> => {
        return new Promise((resolve, reject) => {
            this.db.findOne({_id}, (error, doc) => {
                if (error) {
                    reject(error)
                } else if (!doc) {
                    resolve(true)
                }

                reject('Atom already in db')
            })
        })
    }

    private dbFind = (opt: any): Promise<RadixAtomStoreEntry[]> => {
        return new Promise((resolve, reject) => {
            this.db.find<RadixAtomStoreEntry>(opt, (error, doc) => {
                if (error) {
                    reject(error)
                } else {
                    resolve(doc)
                }
            })
        })
    }

    private dbInsert = (entry: RadixAtomStoreEntry): Promise<RadixAtomStoreEntry> => {
        return new Promise((resolve, reject) => {
            this.db.insert(entry, (error, doc) => {
                if (error) {
                    reject(error)
                } else {
                    resolve(doc)
                }
            })
        })
    }

    private dbUpdate = (_id: string, status: RadixAtomNodeStatusUpdate): Promise<boolean> => {
        return new Promise((resolve, reject) => {
            const update = {$set: {status}}

            this.db.update({_id}, update, {}, (error, numReplaced) => {
                if (error || numReplaced === 0) {
                    reject(false)
                } else {
                    resolve(true)
                }
            })
        })
    }


    private dbRemove = (opt: any): Promise<number> => {
        return new Promise((resolve, reject) => {
            this.db.remove(opt, (error, doc) => {
                if (error) {
                    reject(error)
                } else {
                    resolve(doc)
                }
            })
        })
    }

}
