import { TSMap } from 'typescript-map'
import { Subject, of, Observable } from 'rxjs'
import { filter } from 'rxjs/operators'

import BN from 'bn.js'

import { RadixAccountSystem, RadixAtomUpdate } from '../..'
import { RadixTokenClass, RadixTokenSupplyType } from '../token/RadixTokenClass'
import {
    RadixTokenClassParticle,
    RadixSpin,
    RadixAddress,
    RadixOwnedTokensParticle,
    RadixFungibleType,
    RadixTokenPermissions,
    RadixTokenPermissionsValues,
} from '../atommodel'

export class RadixTokenClassAccountSystem implements RadixAccountSystem {
    public name = 'TOKENS'

    public tokenClasses = new TSMap<string, RadixTokenClass>()

    private tokenClassSubject: Subject<RadixTokenClass> = new Subject()
    private processedAtomHIDs = new TSMap<string, boolean>()


    constructor(readonly address: RadixAddress) {
        // Empty constructor
    }

    public processAtomUpdate(atomUpdate: RadixAtomUpdate) {
        if (!atomUpdate.atom.containsParticle(RadixTokenClassParticle, RadixOwnedTokensParticle)) {
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

        if (this.processedAtomHIDs.has(atom.hid.toString())) {
            return
        }
        this.processedAtomHIDs.set(atom.hid.toString(), true)

        for (const spunParticle of atom.getParticles()) {

            if (spunParticle.particle instanceof RadixTokenClassParticle && spunParticle.spin === RadixSpin.UP) {
                this.createOrUpdateTokenClass(spunParticle.particle)

            } else if (spunParticle.particle instanceof RadixOwnedTokensParticle
                && spunParticle.spin === RadixSpin.UP
                && (spunParticle.particle as RadixOwnedTokensParticle).getType() !== RadixFungibleType.TRANSFER) {

                const particle = (spunParticle.particle as RadixOwnedTokensParticle)

                const amount = new BN(particle.getAmount())
                if (particle.getType() === RadixFungibleType.MINT) {
                    this.updateTotalSupply(particle, amount)
                } else if (particle.getType() === RadixFungibleType.BURN) {
                    this.updateTotalSupply(particle, amount.neg())
                }
            }
        }
    }

    public processDeleteAtom(atomUpdate: RadixAtomUpdate): any {
        const atom = atomUpdate.atom

        if (!this.processedAtomHIDs.has(atom.hid.toString())) {
            return
        }
        this.processedAtomHIDs.delete(atom.hid.toString())

        for (const spunParticle of atom.getParticles()) {

            if (spunParticle.particle instanceof RadixTokenClassParticle && spunParticle.spin === RadixSpin.DOWN) {
                this.createOrUpdateTokenClass(spunParticle.particle)

            } else if (spunParticle.particle instanceof RadixOwnedTokensParticle
                && spunParticle.spin === RadixSpin.UP
                && (spunParticle.particle as RadixOwnedTokensParticle).getType() !== RadixFungibleType.TRANSFER) {

                const particle = (spunParticle.particle as RadixOwnedTokensParticle)

                const amount = new BN(particle.getAmount())
                if (particle.getType() === RadixFungibleType.MINT) {
                    this.updateTotalSupply(particle, amount.neg())
                } else if (particle.getType() === RadixFungibleType.BURN) {
                    this.updateTotalSupply(particle, amount)
                }
            }
        }
    }

    private createOrUpdateTokenClass(particle: RadixTokenClassParticle) {
        const reference = particle.getTokenClassReference()

        if (!this.tokenClasses.has(reference.unique)) {
            this.tokenClasses.set(reference.unique, new RadixTokenClass(reference.address, reference.unique))
        }

        const tokenClass = this.tokenClasses.get(reference.unique)

        tokenClass.symbol = reference.unique
        tokenClass.name = particle.name
        tokenClass.description = particle.description
        tokenClass.granularity = particle.granularity

        const mintPermissions = particle.permissions.mint
        if (mintPermissions === RadixTokenPermissionsValues.SAME_ATOM_ONLY || mintPermissions === RadixTokenPermissionsValues.GENESIS_ONLY) {
            tokenClass.tokenSupplyType = RadixTokenSupplyType.FIXED
        } else if (mintPermissions === RadixTokenPermissionsValues.TOKEN_OWNER_ONLY) {
            tokenClass.tokenSupplyType = RadixTokenSupplyType.MUTABLE
        } else if (mintPermissions === RadixTokenPermissionsValues.POW) {
            tokenClass.tokenSupplyType = RadixTokenSupplyType.POW
        } else {
            throw new Error(`Token particle with MINT permissions ${mintPermissions} not supported`)
        }

        this.tokenClassSubject.next(tokenClass)
    }

    private updateTotalSupply(particle: RadixOwnedTokensParticle, amount: BN) {
        const reference = particle.getTokenClassReference()

        if (!this.tokenClasses.has(reference.unique)) {
            this.tokenClasses.set(reference.unique, new RadixTokenClass(reference.address, reference.unique))
        }
        
        const tokenClass = this.tokenClasses.get(reference.unique)

        tokenClass.addTotalSupply(amount)

        this.tokenClassSubject.next(tokenClass)
    }

    public getTokenClass(symbol: string) {

        if (this.tokenClasses.has(symbol)) {
            return this.tokenClasses.get(symbol)
        }

        return null
    }

    // Subscribe for symbol
    public getTokenClassObservable(symbol: string) {
        const currentTokenClassObservable = Observable.create((observer) => {
            if (this.tokenClasses.has(symbol)) {
                observer.next(this.tokenClasses.get(symbol))
            }
        })

        return this.tokenClassSubject
            .pipe(filter(x => x.symbol === symbol))
            .merge(currentTokenClassObservable)
            .share()
    }

    public getAllTokenClassObservable() {
        return this.tokenClassSubject.share()
    }
}
