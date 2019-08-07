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
    RRI,
    RadixTransferrableTokensParticle,
    RadixFixedSupplyTokenDefinitionParticle,
    RadixMutableSupplyTokenDefinitionParticle,
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
        if (!atomUpdate.atom.containsParticle(
            RadixFixedSupplyTokenDefinitionParticle, 
            RadixMutableSupplyTokenDefinitionParticle, 
            RadixUnallocatedTokensParticle)) {
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

        if (this.processedAtomHIDs.has(atom.getAidString())) {
            return
        }
        this.processedAtomHIDs.set(atom.getAidString(), true)


        for (const particleGroup  of atom.getParticleGroups()) {
            let tokenDefinition: RadixTokenDefinition


            if (particleGroup.containsParticle(RadixFixedSupplyTokenDefinitionParticle)) { 
                for (const spunParticle of particleGroup.getParticles()) { 
                    if (spunParticle.particle instanceof RadixFixedSupplyTokenDefinitionParticle && spunParticle.spin === RadixSpin.UP) {
                        this.createOrUpdateFixedTokenDefinition(spunParticle.particle)
                    }
                }
            } else if (particleGroup.containsParticle(RadixMutableSupplyTokenDefinitionParticle)) {
                // Token definition
                for (const spunParticle of particleGroup.getParticles()) {
                    if (spunParticle.particle instanceof RadixMutableSupplyTokenDefinitionParticle && spunParticle.spin === RadixSpin.UP) {
                        this.createOrUpdateMutableTokenDefinition(spunParticle.particle)
                    } else if (spunParticle.particle instanceof RadixUnallocatedTokensParticle) {
                        const particle = (spunParticle.particle as RadixUnallocatedTokensParticle)
                        tokenDefinition = this.getOrCreateTokenDefinition(particle.getTokenDefinitionReference())

                        if (spunParticle.spin === RadixSpin.UP) {
                            tokenDefinition.unallocatedTokens.set(particle.getHidString(), particle)
                        } else {
                            tokenDefinition.unallocatedTokens.delete(particle.getHidString())
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
                            tokenDefinition.unallocatedTokens.set(particle.getHidString(), particle)
                            tokenDefinition.addTotalSupply(particle.getAmount().neg())
                        } else {
                            tokenDefinition.unallocatedTokens.delete(particle.getHidString())
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

        if (!this.processedAtomHIDs.has(atom.getAidString())) {
            return
        }
        this.processedAtomHIDs.delete(atom.getAidString())

        for (const particleGroup  of atom.getParticleGroups()) {
            let tokenDefinition

            if (particleGroup.containsParticle(RadixFixedSupplyTokenDefinitionParticle)) { 
                for (const spunParticle of particleGroup.getParticles()) { 
                    if (spunParticle.particle instanceof RadixFixedSupplyTokenDefinitionParticle && spunParticle.spin === RadixSpin.DOWN) {
                        this.createOrUpdateFixedTokenDefinition(spunParticle.particle)
                    }
                }
            } else if (particleGroup.containsParticle(RadixMutableSupplyTokenDefinitionParticle)) {
                // Token definition
                for (const spunParticle of particleGroup.getParticles()) {
                    if (spunParticle.particle instanceof RadixMutableSupplyTokenDefinitionParticle && spunParticle.spin === RadixSpin.DOWN) {
                        this.createOrUpdateMutableTokenDefinition(spunParticle.particle)
                    } else if (spunParticle.particle instanceof RadixUnallocatedTokensParticle) {
                        const particle = (spunParticle.particle as RadixUnallocatedTokensParticle)
                        tokenDefinition = this.getOrCreateTokenDefinition(particle.getTokenDefinitionReference())

                        if (spunParticle.spin === RadixSpin.DOWN) {
                            tokenDefinition.unallocatedTokens.set(particle.getHidString(), particle)
                        } else {
                            tokenDefinition.unallocatedTokens.delete(particle.getHidString())
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
                            tokenDefinition.unallocatedTokens.set(particle.getHidString(), particle)
                            tokenDefinition.addTotalSupply(particle.getAmount().neg())
                        } else {
                            tokenDefinition.unallocatedTokens.delete(particle.getHidString())
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

    private createOrUpdateFixedTokenDefinition(particle: RadixFixedSupplyTokenDefinitionParticle) {
        const reference = particle.getRRI()

        const tokenDefinition = this.getOrCreateTokenDefinition(reference)

        tokenDefinition.symbol = reference.getName()
        tokenDefinition.name = particle.name
        tokenDefinition.description = particle.description
        tokenDefinition.granularity = particle.granularity
        tokenDefinition.iconUrl = particle.iconUrl
        tokenDefinition.tokenSupplyType = RadixTokenSupplyType.FIXED
        tokenDefinition.totalSupply = particle.getSupply()

        this.tokenDefinitionSubject.next(tokenDefinition)
    }

    private createOrUpdateMutableTokenDefinition(particle: RadixMutableSupplyTokenDefinitionParticle) {
        const reference = particle.getRRI()

        const tokenDefinition = this.getOrCreateTokenDefinition(reference)

        tokenDefinition.symbol = reference.getName()
        tokenDefinition.name = particle.name
        tokenDefinition.description = particle.description
        tokenDefinition.granularity = particle.granularity
        tokenDefinition.iconUrl = particle.iconUrl
        tokenDefinition.tokenSupplyType = RadixTokenSupplyType.MUTABLE

        this.tokenDefinitionSubject.next(tokenDefinition)
    }

    private getOrCreateTokenDefinition(reference: RRI) {
        if (!this.tokenDefinitions.has(reference.getName())) {
            this.tokenDefinitions.set(reference.getName(), new RadixTokenDefinition(reference.address, reference.getName()))
        }        
        return this.tokenDefinitions.get(reference.getName())
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
