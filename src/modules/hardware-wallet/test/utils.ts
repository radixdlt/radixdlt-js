import {
    RadixIdentity,
    RadixAddress,
    RadixParticleGroup,
    RadixTransferrableTokensParticle,
    RRI,
    RadixSpunParticle,
    RadixMessageParticle,
    RadixUnallocatedTokensParticle,
    RadixTokenPermissionsValues,
    RadixUniqueParticle,
    RadixRRIParticle,
} from 'radixdlt'
import BN from 'bn.js'

export interface TokenData {
    rri: RRI,
    availableAmount: number,
}

const tokenParticle = (_amount: number, owner: RadixAddress, token: TokenData) => {
    return new RadixTransferrableTokensParticle(
        new BN(_amount),
        new BN(1),
        owner,
        0,
        token.rri,
        {},
    )
}


export function createTransferAction(from: RadixAddress, to: RadixAddress, token: TokenData, amount: number): RadixParticleGroup {
    if (token.availableAmount - amount < 0) { throw new Error("Can't send more than available amount.") }

    const particleGroup = new RadixParticleGroup()

    const downTokenParticle = RadixSpunParticle.down(tokenParticle(token.availableAmount, from, token))
    const upTokenParticleRecipient = RadixSpunParticle.up(tokenParticle(amount, to, token))

    particleGroup.particles.push(downTokenParticle, upTokenParticleRecipient)

    if (token.availableAmount - amount > 0) {
        const upTokenParticleSender = RadixSpunParticle.up(tokenParticle(token.availableAmount - amount, from, token))
        particleGroup.particles.push(upTokenParticleSender)
    }

    return particleGroup
}

export function createMessageAction(from: RadixAddress, to: RadixAddress, message: string) {
    const particleGroup = new RadixParticleGroup()

    const msg = new RadixMessageParticle(
        from,
        to,
        message,
        {},
    )

    particleGroup.particles = [
        RadixSpunParticle.up(msg),
    ]

    return particleGroup
}

export function createBurnAction(
    owner: RadixAddress,
    token: TokenData,
    amount: number,
) {

    const burnParticleGroup = new RadixParticleGroup()

    burnParticleGroup.particles.push(RadixSpunParticle.down(tokenParticle(10, owner, {
        rri: token.rri,
        availableAmount: 1000,
    })))


    burnParticleGroup.particles.push(RadixSpunParticle.up(
        new RadixUnallocatedTokensParticle(
            new BN(amount),
            new BN(1),
            token.rri,
            {
                mint: RadixTokenPermissionsValues.ALL,
                burn: RadixTokenPermissionsValues.ALL,
            },
        )))

    if (token.availableAmount - amount > 0) {
        burnParticleGroup.particles.push(RadixSpunParticle.up(
            new RadixTransferrableTokensParticle(
                new BN(token.availableAmount - amount),
                new BN(1),
                owner,
                token.rri,
                {
                    mint: RadixTokenPermissionsValues.ALL,
                    burn: RadixTokenPermissionsValues.ALL,
                },
            )))
    }

    return burnParticleGroup
}

export function createUniqueAction(address: RadixAddress, unique: string) {
    const uniqueParticle = new RadixUniqueParticle(address, unique)
    const rriParticle = new RadixRRIParticle(uniqueParticle.getRRI())

    const uniqueParticleGroup = new RadixParticleGroup([
        RadixSpunParticle.down(rriParticle),
        RadixSpunParticle.up(uniqueParticle),
    ])

    return uniqueParticleGroup
}
