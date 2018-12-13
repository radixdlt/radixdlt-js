import { RadixAccountSystem, RadixAtomUpdate } from '../..';
import { RadixTokenClassParticle, 
    RadixSpin, 
    RadixAddress, 
    RadixOwnedTokensParticle, 
    RadixFungibleType, RadixTokenPermissions, RadixTokenPermissionsValues } from '../atommodel';
import { TSMap } from 'typescript-map';
import { Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { RadixTokenClass, RadixTokenSupplyType } from '../token/RadixTokenClass';
import BN from 'bn.js'


export class RadixTokenClassAccountSystem implements RadixAccountSystem {
    public name = 'TOKENS'   

    public tokenClasses = new TSMap<string, RadixTokenClass>()

    private tokenClassSubject: Subject<RadixTokenClass> = new Subject()

    constructor(readonly address: RadixAddress) {
        //
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


        for (const spunParticle of atom.particles) {

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

        for (const spunParticle of atom.particles) {

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

        if (!this.tokenClasses.has(reference.symbol)) {
            this.tokenClasses.set(reference.symbol, new RadixTokenClass(reference.address, reference.symbol))
        }

        const tokenClass = this.tokenClasses.get(reference.symbol)

        tokenClass.symbol = reference.symbol
        tokenClass.name = particle.name
        tokenClass.description = particle.description
        tokenClass.icon = particle.icon.bytes
        
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

        if (!this.tokenClasses.has(reference.symbol)) {
            this.tokenClasses.set(reference.symbol, new RadixTokenClass(reference.address, reference.symbol))
        }

        const tokenClass = this.tokenClasses.get(reference.symbol)

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
        return this.tokenClassSubject
            .pipe(filter(x => x.symbol === symbol))
            .share()
    }

    public getAllTokenClassObservable() {
        return this.tokenClassSubject.share()
    }
    
}
