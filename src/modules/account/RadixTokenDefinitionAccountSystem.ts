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
    RadixUnallocatedTokensParticle,
    RadixResourceIdentifier,
    RadixTokenDefinitionParticle,
    RadixTransferrableTokensParticle,
    RadixTokenDefinitionReference,
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
        if (!atomUpdate.atom.containsParticle(RadixTokenDefinitionParticle, RadixUnallocatedTokensParticle)) {
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


        for (const particleGroup  of atom.getParticleGroups()) {
            let tokenDefinition: RadixTokenDefinition

            if (particleGroup.containsParticle(RadixTokenDefinitionParticle)) {
                // Token definition
                for (const spunParticle of particleGroup.getParticles()) {
                    if (spunParticle.particle instanceof RadixTokenDefinitionParticle && spunParticle.spin === RadixSpin.UP) {
                        this.createOrUpdateTokenDefinition(spunParticle.particle)
                    } else if (spunParticle.particle instanceof RadixUnallocatedTokensParticle) {
                        const particle = (spunParticle.particle as RadixUnallocatedTokensParticle)
                        tokenDefinition = this.getOrCreateTokenDefinition(particle.getTokenDefinitionReference())

                        if (spunParticle.spin === RadixSpin.UP) {
                            tokenDefinition.unallocatedTokens.set(particle.getHID().toString(), particle)
                        } else {
                            tokenDefinition.unallocatedTokens.delete(particle.getHID().toString())
                        }
                    } 
                }

            } else if (
                particleGroup.containsParticle(RadixUnallocatedTokensParticle)
                && particleGroup.containsParticle(RadixTransferrableTokensParticle)) {
                // Mint or burn
                for (const spunParticle of particleGroup.getParticles()) {
                    if (spunParticle.particle instanceof RadixUnallocatedTokensParticle) {
                        const particle = (spunParticle.particle as RadixUnallocatedTokensParticle)
                        tokenDefinition = this.getOrCreateTokenDefinition(particle.getTokenDefinitionReference())

                        if (spunParticle.spin === RadixSpin.UP) {
                            tokenDefinition.unallocatedTokens.set(particle.getHID().toString(), particle)
                            tokenDefinition.addTotalSupply(particle.getAmount().neg())
                        } else {
                            tokenDefinition.unallocatedTokens.delete(particle.getHID().toString())
                            tokenDefinition.addTotalSupply(particle.getAmount())
                        }
                    } 
                }
            }

            if (tokenDefinition) {
                this.tokenDefinitionSubject.next(tokenDefinition)
            }
        }
    }

    public processDeleteAtom(atomUpdate: RadixAtomUpdate): any {
        const atom = atomUpdate.atom

        if (!this.processedAtomHIDs.has(atom.hid.toString())) {
            return
        }
        this.processedAtomHIDs.delete(atom.hid.toString())

        for (const particleGroup  of atom.getParticleGroups()) {
            let tokenDefinition

            if (particleGroup.containsParticle(RadixTokenDefinitionParticle)) {
                // Token definition
                for (const spunParticle of particleGroup.getParticles()) {
                    if (spunParticle.particle instanceof RadixTokenDefinitionParticle && spunParticle.spin === RadixSpin.DOWN) {
                        this.createOrUpdateTokenDefinition(spunParticle.particle)
                    } else if (spunParticle.particle instanceof RadixUnallocatedTokensParticle) {
                        const particle = (spunParticle.particle as RadixUnallocatedTokensParticle)
                        tokenDefinition = this.getOrCreateTokenDefinition(particle.getTokenDefinitionReference())

                        if (spunParticle.spin === RadixSpin.DOWN) {
                            tokenDefinition.unallocatedTokens.set(particle.getHID().toString(), particle)
                        } else {
                            tokenDefinition.unallocatedTokens.delete(particle.getHID().toString())
                        }
                    } 
                }

            } else if (
                particleGroup.containsParticle(RadixUnallocatedTokensParticle)
                && particleGroup.containsParticle(RadixTransferrableTokensParticle)) {
                // Mint or burn
                for (const spunParticle of particleGroup.getParticles()) {
                    if (spunParticle.particle instanceof RadixUnallocatedTokensParticle) {
                        const particle = (spunParticle.particle as RadixUnallocatedTokensParticle)
                        tokenDefinition = this.getOrCreateTokenDefinition(particle.getTokenDefinitionReference())

                        if (spunParticle.spin === RadixSpin.DOWN) {
                            tokenDefinition.unallocatedTokens.set(particle.getHID().toString(), particle)
                            tokenDefinition.addTotalSupply(particle.getAmount().neg())
                        } else {
                            tokenDefinition.unallocatedTokens.delete(particle.getHID().toString())
                            tokenDefinition.addTotalSupply(particle.getAmount())
                        }
                    } 
                }
            }

            if (tokenDefinition) {
                this.tokenDefinitionSubject.next(tokenDefinition)
            }
        }
    }

    private createOrUpdateTokenDefinition(particle: RadixTokenDefinitionParticle) {
        const reference = particle.getTokenDefinitionReference()

        const tokenDefinition = this.getOrCreateTokenDefinition(reference)

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

    private getOrCreateTokenDefinition(reference: RadixResourceIdentifier | RadixTokenDefinitionReference) {
        if (!this.tokenDefinitions.has(reference.unique)) {
            this.tokenDefinitions.set(reference.unique, new RadixTokenDefinition(reference.address, reference.unique))
        }        
        return this.tokenDefinitions.get(reference.unique)
    }

    public getTokenDefinition(symbol: string): RadixTokenDefinition {
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
