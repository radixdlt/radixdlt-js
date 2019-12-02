import { Map } from "immutable"
import { Subject, of, Observable } from 'rxjs'
import { filter } from 'rxjs/operators'
import { RadixAccountSystem, RadixAtomObservation, RadixAtomStatusIsInsert, RadixAtomNodeStatus } from '../..'
import { RadixTokenDefinition, RadixTokenSupplyType } from '../token/RadixTokenDefinition'
import {
    RadixSpin,
    RadixAddress,
    RadixUnallocatedTokensParticle,
    RRI,
    RadixTransferrableTokensParticle,
    RadixFixedSupplyTokenDefinitionParticle,
    RadixMutableSupplyTokenDefinitionParticle,
    RadixAtom,
    RadixSpunParticle,
    RadixParticleGroup,
} from '../atommodel'
import { TokenType, AtomOperation } from "./types"

export interface TokenDefinitionState {
    tokenDefinitions: Map<string, RadixTokenDefinition>
}

type TokenDefinitions = Map<string, RadixTokenDefinition>

export class RadixTokenDefinitionAccountSystem implements RadixAccountSystem {
    public name = 'TOKENS'

    private state: TokenDefinitionState = {
        tokenDefinitions: Map<string, RadixTokenDefinition>()
    }

    private pendingState = Map<string, TokenDefinitionState>()

    private tokenDefinitionSubject: Subject<RadixTokenDefinition> = new Subject()
    private processedAtomHIDs = Map<string, boolean>()


    constructor(readonly address: RadixAddress) {
        // Empty constructor
    }


    public processAtomUpdate(atomUpdate: RadixAtomObservation) {
        if (!atomUpdate.atom.containsParticle(
            RadixFixedSupplyTokenDefinitionParticle,
            RadixMutableSupplyTokenDefinitionParticle,
            RadixUnallocatedTokensParticle)) {
            return
        }
        //console.log(atomUpdate.status.status)
        if (RadixAtomStatusIsInsert[atomUpdate.status.status]) {
            if (atomUpdate.status.status === RadixAtomNodeStatus.PENDING) {
                this.processPendingAtom(atomUpdate)
            } else {
                this.processStoreAtom(atomUpdate)
            }
        } else {
            this.processDeleteAtom(atomUpdate)
        }
    }

    public getTokenDefinition(symbol: string): RadixTokenDefinition {
        if (this.getState().tokenDefinitions.has(symbol)) {
            return this.getState().tokenDefinitions.get(symbol)
        }

        return null
    }

    // Subscribe for symbol
    public getTokenDefinitionObservable(symbol: string): Observable<RadixTokenDefinition> {
        return Observable.create((observer) => {
            if (this.getState().tokenDefinitions.has(symbol)) {
                observer.next(this.getState().tokenDefinitions.get(symbol))
            }

            this.tokenDefinitionSubject
                .pipe(filter(x => x.symbol === symbol))
                .subscribe(observer)
        })
    }

    public getAllTokenDefinitionObservable() {
        return this.tokenDefinitionSubject.share()
    }

    public getState(pending = true): TokenDefinitionState {
        if (pending) {
            return {
                tokenDefinitions: this.applyPendingState()
            }
        }
        return this.state
    }

    public static processParticleGroups(
        particleGroups: RadixParticleGroup[],
        state: TokenDefinitionState,
        subject?: Subject<RadixTokenDefinition>
    ) {
        let newState = {
            tokenDefinitions: this.copyTokenDefinitions(state.tokenDefinitions)
        }

        for (const particleGroup of particleGroups) {
            let tokenDefinition: RadixTokenDefinition
            const tokenType = this.getTokenType(particleGroup)

            const particles = particleGroup.getParticles()

            switch (tokenType) {
                case TokenType.FIXED:
                    this.findFixedTokenUpParticle(particles).map(spunParticle => {
                        newState.tokenDefinitions = this.createOrUpdateFixedTokenDefinition(spunParticle, newState.tokenDefinitions, subject)
                    })
                    break
                case TokenType.MUTABLE:
                    this.findMutableTokenUpParticle(particles).map((spunParticle) => {
                        newState.tokenDefinitions = this.createOrUpdateMutableTokenDefinition(spunParticle, newState.tokenDefinitions, subject)
                    })

                    this.findUnallocatedTokenParticles(particles).map(spunParticle => {
                        const particle = (spunParticle.particle as RadixUnallocatedTokensParticle)

                        tokenDefinition = this.getOrCreateTokenDefinition(particle.getTokenDefinitionReference(), newState.tokenDefinitions)
                        newState.tokenDefinitions = newState.tokenDefinitions.set(particle.getTokenDefinitionReference().getName(), tokenDefinition)

                        if (spunParticle.spin === RadixSpin.UP) {
                            tokenDefinition.unallocatedTokens = tokenDefinition.unallocatedTokens.set(particle.getHidString(), particle)
                        } else {
                            tokenDefinition.unallocatedTokens = tokenDefinition.unallocatedTokens.delete(particle.getHidString())
                        }
                    })
                    break
                case TokenType.UNALLOCATED:
                    this.findUnallocatedTokenParticles(particles).map(spunParticle => {
                        const particle = (spunParticle.particle as RadixUnallocatedTokensParticle)

                        tokenDefinition = this.getOrCreateTokenDefinition(particle.getTokenDefinitionReference(), newState.tokenDefinitions)
                        newState.tokenDefinitions = newState.tokenDefinitions.set(particle.getTokenDefinitionReference().getName(), tokenDefinition)

                        if (spunParticle.spin === RadixSpin.UP) {
                            tokenDefinition.unallocatedTokens = tokenDefinition.unallocatedTokens.set(particle.getHidString(), particle)
                            tokenDefinition.addTotalSupply(particle.getAmount().neg())
                        } else {
                            tokenDefinition.unallocatedTokens = tokenDefinition.unallocatedTokens.delete(particle.getHidString())
                            tokenDefinition.addTotalSupply(particle.getAmount())
                        }
                    })
                    break
            }

            if (tokenDefinition && subject) {
                subject.next(tokenDefinition)
            }
        }

        return newState
    }

    private static findFixedTokenUpParticle(particles: RadixSpunParticle[]) {
        return particles.filter(
            spunParticle =>
                spunParticle.particle instanceof RadixFixedSupplyTokenDefinitionParticle &&
                spunParticle.spin === RadixSpin.UP
        )
    }

    private static findMutableTokenUpParticle(particles: RadixSpunParticle[]) {
        return particles.filter(
            spunParticle =>
                spunParticle.particle instanceof RadixMutableSupplyTokenDefinitionParticle &&
                spunParticle.spin === RadixSpin.UP
        )
    }

    private static findUnallocatedTokenParticles(particles: RadixSpunParticle[]) {
        return particles.filter(spunParticle =>
            spunParticle.particle instanceof RadixUnallocatedTokensParticle
        )
    }

    private processPendingAtom(atomUpdate: RadixAtomObservation): any {
        const atom = atomUpdate.atom

        if (this.processedAtomHIDs.has(atom.getAidString())) {
            return
        }
        this.processedAtomHIDs = this.processedAtomHIDs.set(atom.getAidString(), true)

        let newPendingState = RadixTokenDefinitionAccountSystem.processParticleGroups(
            atom.getParticleGroups(),
            this.getState(),
            this.tokenDefinitionSubject
        )

        this.pendingState = this.pendingState.set(atomUpdate.atom.getAidString(), newPendingState)
    }

    private processStoreAtom(atomUpdate: RadixAtomObservation) {
        const atom = atomUpdate.atom

        if (this.pendingState.has(atom.getAidString())) {
            this.state.tokenDefinitions = this.applyPendingState(atom)
            this.pendingState = this.pendingState.delete(atom.getAidString())
        } else {
            if (this.processedAtomHIDs.has(atom.getAidString())) {
                return
            }

            this.processedAtomHIDs = this.processedAtomHIDs.set(atom.getAidString(), true)

            const state = {
                tokenDefinitions: this.state.tokenDefinitions
            }

            this.state = RadixTokenDefinitionAccountSystem.processParticleGroups(
                atom.getParticleGroups(),
                state,
                this.tokenDefinitionSubject
            )
        }
    }

    private processDeleteAtom(atomUpdate: RadixAtomObservation): any {
        const atom = atomUpdate.atom

        if (!this.processedAtomHIDs.has(atom.getAidString())) {
            return
        }
        this.processedAtomHIDs = this.processedAtomHIDs.delete(atom.getAidString())

        this.pendingState = this.pendingState.delete(atom.getAidString())
    }


    private applyPendingState(atom?: RadixAtom) {
        let tokenDefinitions = Map<string, RadixTokenDefinition>()

        if (atom) {
            tokenDefinitions = this.pendingState.get(atom.getAidString()).tokenDefinitions
        } else {
            this.pendingState.forEach((tokenDefState, atom) => {
                tokenDefinitions = tokenDefinitions.merge(tokenDefState.tokenDefinitions)
            })
        }

        let newState = RadixTokenDefinitionAccountSystem.copyTokenDefinitions(this.state.tokenDefinitions)

        tokenDefinitions.forEach((tokenDefinition, name) => {
            if (newState.has(name)) {
                let existingTokenDefinition = newState.get(name)
                existingTokenDefinition.symbol = tokenDefinition.symbol
                existingTokenDefinition.name = tokenDefinition.name
                existingTokenDefinition.description = tokenDefinition.description
                existingTokenDefinition.granularity = tokenDefinition.granularity
                existingTokenDefinition.iconUrl = tokenDefinition.iconUrl
                existingTokenDefinition.unallocatedTokens = tokenDefinition.unallocatedTokens

                if (tokenDefinition.tokenSupplyType === RadixTokenSupplyType.FIXED) {
                    existingTokenDefinition.tokenSupplyType = RadixTokenSupplyType.FIXED
                    existingTokenDefinition.totalSupply = tokenDefinition.totalSupply
                } else {
                    existingTokenDefinition.tokenSupplyType = RadixTokenSupplyType.MUTABLE
                }
            } else {
                newState = newState.set(name, tokenDefinition)
            }
        })

        return newState
    }

    private static createOrUpdateFixedTokenDefinition(
        spunParticle: RadixSpunParticle,
        tokenDefinitions: Map<string, RadixTokenDefinition>,
        tokenDefinitionSubject?: Subject<RadixTokenDefinition>
    ): TokenDefinitions {
        let particle = spunParticle.particle as RadixFixedSupplyTokenDefinitionParticle
        const reference = particle.getRRI()

        const tokenDefinition = this.getOrCreateTokenDefinition(reference, tokenDefinitions)

        tokenDefinition.symbol = reference.getName()
        tokenDefinition.name = particle.name
        tokenDefinition.description = particle.description
        tokenDefinition.granularity = particle.granularity
        tokenDefinition.iconUrl = particle.iconUrl
        tokenDefinition.tokenSupplyType = RadixTokenSupplyType.FIXED
        tokenDefinition.totalSupply = particle.getSupply()

        if (tokenDefinitionSubject) {
            tokenDefinitionSubject.next(tokenDefinition)
        }

        return tokenDefinitions.set(reference.getName(), tokenDefinition)
    }

    private static createOrUpdateMutableTokenDefinition(
        spunParticle: RadixSpunParticle,
        tokenDefinitions: Map<string, RadixTokenDefinition>,
        tokenDefinitionSubject?: Subject<RadixTokenDefinition>
    ): TokenDefinitions {
        let particle = spunParticle.particle as RadixMutableSupplyTokenDefinitionParticle
        const reference = particle.getRRI()

        const tokenDefinition = this.getOrCreateTokenDefinition(reference, tokenDefinitions)

        tokenDefinition.symbol = reference.getName()
        tokenDefinition.name = particle.name
        tokenDefinition.description = particle.description
        tokenDefinition.granularity = particle.granularity
        tokenDefinition.iconUrl = particle.iconUrl
        tokenDefinition.tokenSupplyType = RadixTokenSupplyType.MUTABLE

        if (tokenDefinitionSubject) {
            tokenDefinitionSubject.next(tokenDefinition)
        }

        return tokenDefinitions.set(reference.getName(), tokenDefinition)
    }

    private static getTokenType(particleGroup: RadixParticleGroup) {
        if (particleGroup.containsParticle(RadixFixedSupplyTokenDefinitionParticle)) {
            return TokenType.FIXED
        } else if (particleGroup.containsParticle(RadixMutableSupplyTokenDefinitionParticle)) {
            return TokenType.MUTABLE
        } else if (particleGroup.containsParticle(RadixUnallocatedTokensParticle)
            && particleGroup.containsParticle(RadixTransferrableTokensParticle)) {
            return TokenType.UNALLOCATED
        }
    }

    private static getOrCreateTokenDefinition(reference: RRI, tokenDefinitions: Map<string, RadixTokenDefinition>): RadixTokenDefinition {
        if (!tokenDefinitions.has(reference.getName())) {
            return new RadixTokenDefinition(reference.address, reference.getName())
        }
        return tokenDefinitions.get(reference.getName()).copy()
    }

    private static copyTokenDefinitions(original: TokenDefinitions): TokenDefinitions {
        let copy = Map<string, RadixTokenDefinition>()
        original.forEach((tokenDefinition, name) => {
            copy = copy.set(name, tokenDefinition.copy())
        })
        return copy
    }
}
