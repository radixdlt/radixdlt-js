import Datastore from 'nedb'

import RadixAtomCacheProvider from './RadixAtomCacheProvider'

import { RadixAtom, RadixKeyPair, RadixSerializer } from '../atom_model'

export default class RadixNEDBAtomCache implements RadixAtomCacheProvider {
    private db: Datastore

    /**
     * Creates an instance of radix nedbatom cache.
     * @param filename File path on disk in Node, path in localStorage in the browser
     */
    constructor(filename: string) {
        this.db = new Datastore({
            filename,
            autoload: true,
        })
    }

    /**
     * Clears all atoms from the cache
     */
    public reset() {
        this.db.remove({}, { multi: true }, (error, numRemoved) => {
            // Do nothing
        })
    }

    public storeAtom = (atom: RadixAtom) => {


        return this.notExists({ _id: atom._id })
            .then(() => {
                // console.log('Atom doesnt exist, storing ', atom._id, atom)
                // Add particle ids?

                // Serialize
                const serializedAtom = atom.toJson()
                serializedAtom['_id'] = atom._id
                // console.log(serializedAtom)

                // Store
                return this.insert(serializedAtom)
            })
            .then((newDoc: any) => {
                // Success
                // console.log('Atom stored in DB', newDoc)
                // console.log()

                return atom
            })
            .catch(error => {
                // console.error(error)
                console.warn('Atom already in DB')
            })
    }

    public getAtoms = (keyPair?: RadixKeyPair) => {
        // Find
        let query = {}

        // Filter by destination
        if (keyPair) {
            const destination = keyPair.getUID().toJson()
            query = {destinations: destination}
        }

        // console.log(query)
        return this.find(query).then(async (atoms: any[]) => {
            // console.log(atoms)

            // Deserialize
            const deserialized: RadixAtom[] = []
            for (const atom of atoms) {
                deserialized.push(await this.asyncDeserialize(atom))
            }

            return deserialized
        })
    }

    private asyncDeserialize(atom) {
        return new Promise<RadixAtom>((resolve, reject) => {
            setTimeout(() => {
                resolve(RadixSerializer.fromJson(atom))
            }, 0)
        })
    }


    public deleteAtom(atom: RadixAtom) {
        return this.remove({_id: atom._id})
    }

    // Promise wrappers for nedb

    public findOne = (opt: any) => {
        return new Promise((resolve, reject) => {
            this.db.findOne(opt, (error, doc) => {
                if (error) {
                    reject(error)
                } else {
                    resolve(doc)
                }
            })
        })
    }

    public notExists = (opt: any) => {
        return new Promise((resolve, reject) => {
            this.db.findOne(opt, (error, doc) => {
                if (error) {
                    reject(error)
                } else if (!doc) {
                    resolve(true)
                }

                reject('Atom already in db')
            })
        })
    }

    public find = (opt: any) => {
        return new Promise((resolve, reject) => {
            this.db.find(opt, (error, doc) => {
                if (error) {
                    reject(error)
                } else {
                    resolve(doc)
                }
            })
        })
    }

    public insert = (opt: any) => {
        return new Promise((resolve, reject) => {
            this.db.insert(opt, (error, doc) => {
                if (error) {
                    reject(error)
                } else {
                    resolve(doc)
                }
            })
        })
    }


    public remove = (opt: any) => {
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
