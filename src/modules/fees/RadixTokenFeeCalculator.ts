import { RadixAtom, RadixFixedSupplyTokenDefinitionParticle, RadixMutableSupplyTokenDefinitionParticle, RadixParticle, RadixSpin } from '../atommodel'
import BN from 'bn.js'

const bnZERO = new BN(0)

const assertFeeDoesNotOverflow = (fee: BN) => {
    const uint256Max = new BN(2).pow(new BN(256)).sub(new BN(1))

    if (fee.gt(uint256Max)) {
        throw new Error(`Fee cannot be larger than UInt256 max value`)
    }
}

interface FeeEntry {
    feeForAtom(atom: RadixAtom, feeSize: number, outputs: Set<RadixParticle>): BN
}

const perBytesFeeEntry = (units: number, threshold: number, fee: BN): FeeEntry => {

    if (units === undefined || units === null) {
        throw new Error(`units must not be null`)
    }

    if (threshold === undefined || threshold === null) {
        throw new Error(`threshold must not be null`)
    }

    if (fee === undefined || fee === null) {
        throw new Error(`Fee must not be null`)
    }

    if (units <= 0) {
        throw new Error(`Units must be positive, but got: ${units}`)
    }

    if (threshold < 0) {
        throw new Error(`Threshold must be non-negative, but got: ${threshold}`)
    }

    return {
        feeForAtom: (atom: RadixAtom, feeSize: number, outputs: Set<RadixParticle>): BN => {
            const numberOfUnits = feeSize / units
            if (numberOfUnits <= threshold) {
                return bnZERO
            }
            const overThresholdUnits = numberOfUnits - threshold
            const feeTotal = fee.mul(new BN(overThresholdUnits))
            assertFeeDoesNotOverflow(feeTotal)
            return feeTotal
        },
    }
}

export interface Class<T> {
    new(...args: any[]): T
}

export const filterOutParticlesOfTypeFromSet = (particles: Set<RadixParticle>, particleType: Class<RadixParticle>): RadixParticle[] => {
    return filterOutParticlesOfTypeFromArray(Array.from(particles), particleType)
}

export const filterOutParticlesOfTypeFromArray = (particles: RadixParticle[], particleType: Class<RadixParticle>): RadixParticle[] => {
    return particles.filter(p => p instanceof particleType)
}

const perParticleFeeEntry = (particleType: Class<RadixParticle>, threshold: number, fee: BN): FeeEntry => {

    if (threshold === undefined || threshold === null) {
        throw new Error(`threshold must not be null`)
    }

    if (threshold < 0) {
        throw new Error(`Threshold must be non-negative, but got: ${threshold}`)
    }

    if (fee === undefined || fee === null) {
        throw new Error(`Fee must not be null`)
    }

    if (particleType === undefined || particleType === null) {
        throw new Error(`particleType must not be null`)
    }

    return {
        feeForAtom: (atom: RadixAtom, feeSize: number, outputs: Set<RadixParticle>): BN => {
            const particleCount = filterOutParticlesOfTypeFromSet(outputs, particleType).length

            if (particleCount <= threshold) {
                return bnZERO
            }

            const overThresholdParticles = particleCount - threshold

            const feeTotal = fee.mul(new BN(overThresholdParticles))
            assertFeeDoesNotOverflow(feeTotal)
            return feeTotal

        },
    }
}


interface FeeTable {
    minimumFee: BN,
    feeEntries: FeeEntry[]
}

export const milliRads = (count: BN | number): BN => {
    // 1 count is 10^{-3} rads, so we subtract that from the sub-units power
    // No risk of overflow here, as 10^18 is approx 60 bits, plus 64 bits of count will not exceed 256 bits
    const milliRadAmount = new BN(10).pow(new BN(15)).mul(count instanceof BN ? count : new BN(count))
    return milliRadAmount
}

const makeFeeTable = (): FeeTable => {
    return {
        // Minimum fee of 40 millirads
        minimumFee: milliRads(40),
        feeEntries: [
            // 1 millirad per byte after the first three kilobytes
            perBytesFeeEntry(1, 3072, milliRads(1)),

            // 1,000 millirads per fixed supply token definition
            perParticleFeeEntry(RadixFixedSupplyTokenDefinitionParticle, 0, milliRads(1000)),

            // 1,000 millirads per mutable supply token definition
            perParticleFeeEntry(RadixMutableSupplyTokenDefinitionParticle, 0, milliRads(1000)),
        ],
    }
}

const feeForAtom = (atom: RadixAtom, feeSize: number, outputs: Set<RadixParticle>): BN => {

    const feeTable = makeFeeTable()
    const feeEntries = feeTable.feeEntries
    const minimumFee = feeTable.minimumFee

    let incrementalFees = new BN(0)

    for (const entry of feeEntries) {
        incrementalFees = incrementalFees.add(entry.feeForAtom(atom, feeSize, outputs))
    }
    assertFeeDoesNotOverflow(incrementalFees)
    if (incrementalFees.lt(minimumFee)) {
        // ensure at least minimum
        return minimumFee
    } else {
        return incrementalFees
    }
}

export const calculateFeeForAtom = (atom: RadixAtom): BN => {
    const outputs = new Set(atom.getParticlesOfSpin(RadixSpin.UP))
    const feeSize = atom.toDSON().length
    return feeForAtom(atom, feeSize, outputs)
}
