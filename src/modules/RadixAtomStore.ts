import RadixAtom from './atom/RadixAtom'
import RadixSerializer from './serializer/RadixSerializer'
import RadixKeyPair from './wallet/RadixKeyPair'

import { radixConfig } from './common/RadixConfig'

import * as Datastore from 'nedb'

export class RadixAtomStore {
    private db: Datastore

    constructor() {
        // this.db = new Datastore()
    }

    initialize() {
        this.db = new Datastore({
            filename: radixConfig.atomDBFileName,
            autoload: true
        })
    }

    reset() {
        console.warn('Clearing atom DB')
        this.db.remove({}, { multi: true }, function(error, numRemoved) {
            console.log(`Removed ${numRemoved} items`)
        })
    }

    storeAtom = (atom: RadixAtom) => {
        let that = this

        return this.notExists({ _id: atom._id })
            .then(() => {
                // console.log('Atom doesnt exist, storing ', atom._id, atom)
                // Add particle ids?

                // Serialize
                let serializedAtom = atom.toJson()
                serializedAtom['_id'] = atom._id
                // console.log(serializedAtom)

                // Store
                return that.insert(serializedAtom)
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

    getAtoms = (type?: { SERIALIZER: Number }, destination?: RadixKeyPair) => {
        // Find
        let query = {}
        if (type) {
            query['serializer'] = type.SERIALIZER
        }

        // TODO: destination

        // console.log(query)
        return this.find(query).then((atoms: Array<any>) => {
            // console.log(atoms)

            // Deserialize
            let deserialized: Array<RadixAtom> = []
            for (let atom of atoms) {
                deserialized.push(RadixSerializer.fromJson(atom))
            }

            // Return
            return deserialized
        })
    }

    // Promise wrappers for nedb

    findOne = (opt: any) => {
        let that = this
        return new Promise(function(resolve, reject) {
            that.db.findOne(opt, function(error, doc) {
                if (error) {
                    reject(error)
                } else {
                    resolve(doc)
                }
            })
        })
    }

    notExists = (opt: any) => {
        let that = this
        return new Promise(function(resolve, reject) {
            that.db.findOne(opt, function(error, doc) {
                if (error) {
                    reject(error)
                } else if (!doc) {
                    resolve(true)
                }

                reject('Atom already in db')
            })
        })
    }

    find = (opt: any) => {
        let that = this
        return new Promise(function(resolve, reject) {
            that.db.find(opt, function(error, doc) {
                if (error) {
                    reject(error)
                } else {
                    resolve(doc)
                }
            })
        })
    }

    insert = (opt: any) => {
        let that = this
        return new Promise(function(resolve, reject) {
            that.db.insert(opt, function(error, doc) {
                if (error) {
                    reject(error)
                } else {
                    resolve(doc)
                }
            })
        })
    }
}

export let radixAtomStore = new RadixAtomStore()
