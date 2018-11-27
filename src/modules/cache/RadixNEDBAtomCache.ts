import Datastore from 'nedb'


import { RadixAtomCacheProvider } from '../..';
import { RadixAtom, RadixAddress, RadixSerializer } from '../atommodel';
import { logger } from '../common/RadixLogger';

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
                // Serialize
                const serializedAtom = atom.toJSON()
                serializedAtom['_id'] = atom._id

                // Store
                return this.insert(serializedAtom)
            })
            .then((newDoc: any) => {
                return atom
            })
            .catch(error => {
                logger.trace('Atom already in DB')
            })
    }

    public getAtoms = (queryAddress?: RadixAddress) => {
        // Find
        const query = {}

        // logger.info(query)
        return this.find(query).then(async (atoms: any[]) => {
            // logger.info(atoms)

            // Deserialize
            const deserialized: RadixAtom[] = []
            for (const atom of atoms) {
                const deserializedAtom = await this.asyncDeserialize(atom)

                const atomAddresses = deserializedAtom.getAddresses()
                for (const address of atomAddresses) {
                    if (address.equals(queryAddress)) {
                        deserialized.push(deserializedAtom)
                        break
                    }
                }
            }

            return deserialized
        })
    }

    private asyncDeserialize(atom) {
        return new Promise<RadixAtom>((resolve, reject) => {
            setTimeout(() => {
                resolve(RadixSerializer.fromJSON(atom))
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
