import { TSMap } from 'typescript-map'
import { Subject, of, Observable } from 'rxjs'
import { filter } from 'rxjs/operators'

import BN from 'bn.js'

import { RadixAccountSystem, RadixAtomUpdate } from '../..'
import { RadixTokenDefinition, RadixTokenSupplyType } from '../token/RadixTokenDefinition'
import {
    RadixSpin,
    RadixAddress,
    RadixTokenPermissionsValues,
    RadixMintedTokensParticle,
    RadixBurnedTokensParticle,
    RadixResourceIdentifier,
    RadixTokenDefinitionParticle,
} from '../atommodel'

export class RadixTokenDefinitionAccountSystem implements RadixAccountSystem {
    public name = 'TOKENS'

    public tokenDefinitions = new TSMap<string, RadixTokenDefinition>()

    private tokenDefinitionSubject: Subject<RadixTokenDefinition> = new Subject()
    private processedAtomHIDs = new TSMap<string, boolean>()


    constructor(readonly address: RadixAddress) {
        // Empty constructor
    }

    public processAtomUpdate(atomUpdate: RadixAtomUpdate) {
        if (!atomUpdate.atom.containsParticle(RadixTokenDefinitionParticle, RadixMintedTokensParticle, RadixBurnedTokensParticle)) {
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
            if (spunParticle.particle instanceof RadixTokenDefinitionParticle && spunParticle.spin === RadixSpin.UP) {
                this.createOrUpdateTokenDefinition(spunParticle.particle)
            } else if (spunParticle.particle instanceof RadixMintedTokensParticle && spunParticle.spin === RadixSpin.UP) {
                const particle = (spunParticle.particle as RadixMintedTokensParticle)
                this.updateTotalSupply(particle.getTokenDefinitionReference(), particle.getAmount())
            } else if (spunParticle.particle instanceof RadixBurnedTokensParticle && spunParticle.spin === RadixSpin.UP) {
                const particle = (spunParticle.particle as RadixBurnedTokensParticle)
                this.updateTotalSupply(particle.getTokenDefinitionReference(), particle.getAmount().neg())
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
            if (spunParticle.particle instanceof RadixTokenDefinitionParticle && spunParticle.spin === RadixSpin.DOWN) {
                this.createOrUpdateTokenDefinition(spunParticle.particle)
            } else if (spunParticle.particle instanceof RadixMintedTokensParticle && spunParticle.spin === RadixSpin.UP) {
                const particle = (spunParticle.particle as RadixMintedTokensParticle)
                this.updateTotalSupply(particle.getTokenDefinitionReference(), particle.getAmount().neg())
            } else if (spunParticle.particle instanceof RadixBurnedTokensParticle && spunParticle.spin === RadixSpin.UP) {
                const particle = (spunParticle.particle as RadixBurnedTokensParticle)
                this.updateTotalSupply(particle.getTokenDefinitionReference(), particle.getAmount())
            } 
        }
    }

    private createOrUpdateTokenDefinition(particle: RadixTokenDefinitionParticle) {
        const reference = particle.getTokenDefinitionReference()

        if (!this.tokenDefinitions.has(reference.unique)) {
            this.tokenDefinitions.set(reference.unique, new RadixTokenDefinition(reference.address, reference.unique))
        }

        const tokenDefinition = this.tokenDefinitions.get(reference.unique)

        tokenDefinition.symbol = reference.unique
        tokenDefinition.name = particle.name
        tokenDefinition.description = particle.description
        tokenDefinition.granularity = particle.granularity

        const mintPermissions = particle.permissions.mint
        if (mintPermissions === RadixTokenPermissionsValues.TOKEN_CREATION_ONLY || mintPermissions === RadixTokenPermissionsValues.NONE) {
            tokenDefinition.tokenSupplyType = RadixTokenSupplyType.FIXED
        } else if (mintPermissions === RadixTokenPermissionsValues.TOKEN_OWNER_ONLY || mintPermissions === RadixTokenPermissionsValues.ALL) {
            tokenDefinition.tokenSupplyType = RadixTokenSupplyType.MUTABLE
        } else {
            throw new Error(`Token particle with MINT permissions ${mintPermissions} not supported`)
        }

        this.tokenDefinitionSubject.next(tokenDefinition)
    }

    private updateTotalSupply(reference: RadixResourceIdentifier, amount: BN) {
        if (!this.tokenDefinitions.has(reference.unique)) {
            this.tokenDefinitions.set(reference.unique, new RadixTokenDefinition(reference.address, reference.unique))
        }
        
        const tokenDefinition = this.tokenDefinitions.get(reference.unique)

        tokenDefinition.addTotalSupply(amount)

        this.tokenDefinitionSubject.next(tokenDefinition)
    }

    public getTokenDefinition(symbol: string) {

        if (this.tokenDefinitions.has(symbol)) {
            return this.tokenDefinitions.get(symbol)
        }

        return null
    }

    // Subscribe for symbol
    public getTokenDefinitionObservable(symbol: string): Observable<RadixTokenDefinition> {
        return Observable.create((observer) => {
            if (this.tokenDefinitions.has(symbol)) {
                observer.next(this.tokenDefinitions.get(symbol))
            }

            this.tokenDefinitionSubject
                .pipe(filter(x => x.symbol === symbol))
                .subscribe(observer)
        })
    }

    public getAllTokenDefinitionObservable() {
        return this.tokenDefinitionSubject.share()
    }
}
