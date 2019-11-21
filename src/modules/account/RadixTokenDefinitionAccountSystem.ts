import { TSMap } from 'typescript-map'
import { Subject, of, Observable } from 'rxjs'
import { filter } from 'rxjs/operators'
import { RadixAccountSystem, RadixAtomObservation, RadixAtomStatusIsInsert } from '../..'
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
import { TokenType, AtomOperation } from "./types";

export interface TokenDefinitionState {
    tokenDefinitions: TSMap<string, RadixTokenDefinition>
}

export class RadixTokenDefinitionAccountSystem implements RadixAccountSystem {
    public name = 'TOKENS'

    public tokenDefinitions = new TSMap<string, RadixTokenDefinition>()

    private tokenDefinitionSubject: Subject<RadixTokenDefinition> = new Subject()
    private processedAtomHIDs = new TSMap<string, boolean>()


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

        if (RadixAtomStatusIsInsert[atomUpdate.status.status]) {
            this.processStoreAtom(atomUpdate)
        } else {
            this.processDeleteAtom(atomUpdate)
        }
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

    public static processParticleGroups(
        particleGroups: RadixParticleGroup[],
        atomOperation: AtomOperation,
        tokenDefinitions: TSMap<string, RadixTokenDefinition>,
        subject?: Subject<RadixTokenDefinition>
    ) {
        for (const particleGroup of particleGroups) {
            let tokenDefinition: RadixTokenDefinition

            let tokenType = this.getTokenType(particleGroup)
            switch (tokenType) {
                case TokenType.FIXED:
                    for (const spunParticle of particleGroup.getParticles()) {
                        if (spunParticle.particle instanceof RadixFixedSupplyTokenDefinitionParticle) {
                            this.createOrUpdateFixedTokenDefinition(spunParticle, atomOperation, tokenDefinitions, subject)
                        }
                    }
                    break
                case TokenType.MUTABLE:
                    for (const spunParticle of particleGroup.getParticles()) {
                        if (spunParticle.particle instanceof RadixMutableSupplyTokenDefinitionParticle) {
                            this.createOrUpdateMutableTokenDefinition(spunParticle, atomOperation, tokenDefinitions, subject)
                        } else if (spunParticle.particle instanceof RadixUnallocatedTokensParticle) {
                            const particle = (spunParticle.particle as RadixUnallocatedTokensParticle)
                            tokenDefinition = this.getOrCreateTokenDefinition(particle.getTokenDefinitionReference(), tokenDefinitions)

                            if (this.isValidOperation(spunParticle.spin, atomOperation)) {
                                tokenDefinition.unallocatedTokens.set(particle.getHidString(), particle)
                            } else {
                                tokenDefinition.unallocatedTokens.delete(particle.getHidString())
                            }
                        }
                    }
                    break
                case TokenType.UNALLOCATED:
                    for (const spunParticle of particleGroup.getParticles()) {
                        if (spunParticle.particle instanceof RadixUnallocatedTokensParticle) {
                            const particle = (spunParticle.particle as RadixUnallocatedTokensParticle)
                            tokenDefinition = this.getOrCreateTokenDefinition(particle.getTokenDefinitionReference(), tokenDefinitions)

                            if (this.isValidOperation(spunParticle.spin, atomOperation)) {
                                tokenDefinition.unallocatedTokens.set(particle.getHidString(), particle)
                                tokenDefinition.addTotalSupply(particle.getAmount().neg())
                            } else {
                                tokenDefinition.unallocatedTokens.delete(particle.getHidString())
                                tokenDefinition.addTotalSupply(particle.getAmount())
                            }
                        }
                    }
                    break
            }

            if (tokenDefinition && subject) {
                subject.next(tokenDefinition)
            }
        }
    }

    private processStoreAtom(atomUpdate: RadixAtomObservation): any {
        const atom = atomUpdate.atom

        if (this.processedAtomHIDs.has(atom.getAidString())) {
            return
        }
        this.processedAtomHIDs.set(atom.getAidString(), true)

        RadixTokenDefinitionAccountSystem.processParticleGroups(
            atom.getParticleGroups(),
            AtomOperation.STORE,
            this.tokenDefinitions,
            this.tokenDefinitionSubject
        )
    }

    private processDeleteAtom(atomUpdate: RadixAtomObservation): any {
        const atom = atomUpdate.atom

        if (!this.processedAtomHIDs.has(atom.getAidString())) {
            return
        }
        this.processedAtomHIDs.delete(atom.getAidString())

        RadixTokenDefinitionAccountSystem.processParticleGroups(
            atom.getParticleGroups(),
            AtomOperation.DELETE,
            this.tokenDefinitions,
            this.tokenDefinitionSubject
        )
    }

    private static createOrUpdateFixedTokenDefinition(
        spunParticle: RadixSpunParticle,
        atomOperation: AtomOperation,
        tokenDefinitions: TSMap<string, RadixTokenDefinition>,
        tokenDefinitionSubject?: Subject<RadixTokenDefinition>
    ) {
        if (!this.isValidOperation(spunParticle.spin, atomOperation)) {
            return
        }

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
    }

    private static createOrUpdateMutableTokenDefinition(
        spunParticle: RadixSpunParticle,
        atomOperation: AtomOperation,
        tokenDefinitions: TSMap<string, RadixTokenDefinition>,
        tokenDefinitionSubject?: Subject<RadixTokenDefinition>
    ) {
        if (!this.isValidOperation(spunParticle.spin, atomOperation)) {
            return
        }

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

    // Should rename this method
    private static isValidOperation(spin: RadixSpin, atomOperation: AtomOperation) {
        let isValidStoreOperation: boolean = atomOperation === AtomOperation.STORE && spin === RadixSpin.UP
        let isValidDeleteOperation: boolean = atomOperation === AtomOperation.DELETE && spin === RadixSpin.DOWN

        return isValidDeleteOperation || isValidStoreOperation
    }

    private static getOrCreateTokenDefinition(reference: RRI, tokenDefinitions: TSMap<string, RadixTokenDefinition>) {
        if (!tokenDefinitions.has(reference.getName())) {
            tokenDefinitions.set(reference.getName(), new RadixTokenDefinition(reference.address, reference.getName()))
        }
        return tokenDefinitions.get(reference.getName())
    }
}
