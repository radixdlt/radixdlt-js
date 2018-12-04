import { RadixAccountSystem, RadixAtomUpdate } from '../..';
import { RadixTokenClassParticle, RadixSpin, RadixEUID, RadixAddress } from '../atommodel';
import { TSMap } from 'typescript-map';


export class RadixTokenClassAccountSystem implements RadixAccountSystem {
    public name = 'TOKENS'   


    private downTokenClasses = new TSMap<RadixEUID, RadixTokenClassParticle>()
    private upTokenClasses = new TSMap<RadixEUID, RadixTokenClassParticle>()

    constructor(readonly address: RadixAddress) {
        //
    }
    
    
    public processAtomUpdate(atomUpdate: RadixAtomUpdate) {
        if (!atomUpdate.atom.containsParticle(RadixTokenClassParticle)) {
            return
        }

        if (atomUpdate.action === 'STORE') {
            this.processStoreAtom(atomUpdate)
        } else if (atomUpdate.action === 'DELETE') {
            this.processDeleteAtom(atomUpdate)
        }
    }
    
    public processStoreAtom(atomUpdate: RadixAtomUpdate): any {
        const atom = atomUpdate.atom

        const upTokenClasses = atom.getParticlesOfType(RadixTokenClassParticle, RadixSpin.UP)
        const downTokenClasses = atom.getParticlesOfType(RadixTokenClassParticle, RadixSpin.DOWN)

        for (const tokenClass of downTokenClasses) {
            this.upTokenClasses.delete(tokenClass.hid)
            this.downTokenClasses.set(tokenClass.hid, tokenClass)
        }

        for (const tokenClass of upTokenClasses) {
            this.upTokenClasses.set(tokenClass.hid, tokenClass)
            this.downTokenClasses.delete(tokenClass.hid)
        }
    }

    public processDeleteAtom(atomUpdate: RadixAtomUpdate): any {
        const atom = atomUpdate.atom

        const upTokenClasses = atom.getParticlesOfType(RadixTokenClassParticle, RadixSpin.UP)
        const downTokenClasses = atom.getParticlesOfType(RadixTokenClassParticle, RadixSpin.DOWN)

        for (const tokenClass of downTokenClasses) {
            this.upTokenClasses.set(tokenClass.hid, tokenClass)
            this.downTokenClasses.delete(tokenClass.hid)
        }

        for (const tokenClass of upTokenClasses) {
            this.upTokenClasses.delete(tokenClass.hid)
            this.downTokenClasses.set(tokenClass.hid, tokenClass)
        }
    }


    public getTokenClass(symbol: string) {
        // Assumes there is only one up state token class for each symbol
        for (const tokenClass of this.upTokenClasses.values()) {
            if (tokenClass.getTokenClassReference().symbol === symbol) {
                return tokenClass
            }
        }
    }


    // Subscribe for symbol
    public getTokenClassObservable() {
        //
    }
    
}
