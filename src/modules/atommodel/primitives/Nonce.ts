import BN from 'bn.js'
import crypto from 'crypto'

export const safeRandomNumber = (): number => {
    const randomUnboundBN = new BN(crypto.randomBytes(8))
    const bnBound = new BN(Number.MAX_SAFE_INTEGER)

    const randomNumberBN = randomUnboundBN.mod(bnBound)
    const randomNumber = randomNumberBN.toNumber()

    const randomBoolean = Math.random() <= 0.5
    const randomPosOrNegNum = randomNumber * (randomBoolean ? 1 : -1)

    const boundNum = Math.min(
        Math.max(Number.MIN_SAFE_INTEGER, randomPosOrNegNum),
        Number.MAX_SAFE_INTEGER,
    )

    // interval [-Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]
    return boundNum
}

// TODO change to random(min: Int64.min, max: Int64.max)
export const createNonce = (): number => {
    return safeRandomNumber()
}
