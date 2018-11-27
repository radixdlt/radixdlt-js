import RadixAccountSystem from '../account/RadixAccountSystem'
import RadixAtomCacheProvider from './RadixAtomCacheProvider'

import { RadixAtom, RadixAtomUpdate, RadixAddress } from '../atommodel'

export default class RadixCacheAccountSystem implements RadixAccountSystem {
    public name = 'CACHE'
    public atomCache: RadixAtomCacheProvider

    constructor(readonly address: RadixAddress, atomCache?: RadixAtomCacheProvider) {
        if (atomCache) {
            this.atomCache = atomCache
        }
    }

    public async processAtomUpdate(atomUpdate: RadixAtomUpdate) {
        if (!this.atomCache) {
            return
        }

        // Just put it in the cache
        if (atomUpdate.action === 'STORE') {
            this.atomCache.storeAtom(atomUpdate.atom)
        } else if (atomUpdate.action === 'DELETE') {
            this.atomCache.deleteAtom(atomUpdate.atom)
        }        
    }

    public async loadAtoms() {
        return this.atomCache.getAtoms(this.address)
    }   
}
