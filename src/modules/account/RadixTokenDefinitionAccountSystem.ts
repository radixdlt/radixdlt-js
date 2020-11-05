/*
 * (C) Copyright 2020 Radix DLT Ltd
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the “Software”),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

import { TSMap } from 'typescript-map'
import { Observable, Subject } from 'rxjs'
import { filter } from 'rxjs/operators'

import { RadixAccountSystem, RadixAtomObservation, RadixAtomStatusIsInsert } from '../..'
import { RadixTokenDefinition, RadixTokenSupplyType } from '../token/RadixTokenDefinition'
import {
    RadixFixedSupplyTokenDefinitionParticle,
    RadixMutableSupplyTokenDefinitionParticle,
    RadixSpin,
    RadixTransferrableTokensParticle,
    RadixUnallocatedTokensParticle,
    RRI
} from '../atommodel'

export class RadixTokenDefinitionAccountSystem implements RadixAccountSystem {
    public name = 'TOKENS'

    public tokenDefinitions = new TSMap<string, RadixTokenDefinition>()

    private tokenDefinitionSubject: Subject<RadixTokenDefinition> = new Subject()
    private processedAtomHIDs = new TSMap<string, boolean>()

    public processAtomUpdate(atomUpdate: RadixAtomObservation) {
        if (!atomUpdate.atom.containsParticle(
            RadixFixedSupplyTokenDefinitionParticle, 
            RadixMutableSupplyTokenDefinitionParticle, 
            RadixUnallocatedTokensParticle)) {
            return
        }

        if (RadixAtomStatusIsInsert[atomUpdate.status.status]) {
            this.processStoreAtom(atomUpdate)
        } else {
            this.processDeleteAtom(atomUpdate)
        }
    }

    public processStoreAtom(atomUpdate: RadixAtomObservation): any {
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

    public processDeleteAtom(atomUpdate: RadixAtomObservation): any {
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
