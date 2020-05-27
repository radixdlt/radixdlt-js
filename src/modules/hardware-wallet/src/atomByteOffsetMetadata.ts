import { RadixAtom, RadixSpin, RadixTransferrableTokensParticle, RadixParticle } from 'radixdlt'
import cbor from 'cbor'

interface ByteInterval {
    startsAtByte: number,
    byteCount: number
}

export function cborByteOffsetsOfUpParticlesIn(atom: RadixAtom): Buffer {
    const upParticles = atom.getParticlesOfSpin(RadixSpin.UP)

    const byteOffsets = Buffer.alloc(112, 0)
    const bytes = []

    for (const particle of upParticles) {
        let byteIntervalOfKey: (key: string) => ByteInterval

        if (particle instanceof RadixTransferrableTokensParticle) {
            byteIntervalOfKey = byteIntervalInAtom(particle, atom)
        } else {
            byteIntervalOfKey = (key: string) => {
                if (key !== 'serializer') { return { startsAtByte: 0, byteCount: 0 } }
                return byteIntervalInAtom(particle, atom)(key)
            }
        }

        for (const key of ['address', 'amount', 'serializer', 'tokenDefinitionReference']) {
            const interval = byteIntervalOfKey(key)
            bytes.push(interval.startsAtByte)
            bytes.push(interval.byteCount)
        }
    }

    writeBytes(bytes, byteOffsets)

    return byteOffsets
}

const intervalByString = (needle: Buffer, hayStack: Buffer): ByteInterval => {
    return {
        startsAtByte: hayStack.toString('hex').indexOf(needle.toString('hex')) / 2,
        byteCount: needle.length,
    }
}

const byteIntervalInAtom = (particle: RadixParticle, atom: RadixAtom) => (key: string): ByteInterval => {
    const particleEncoded = particle.toDSON()
    const atomEncoded = atom.toDSON()

    const particleIntervalInAtom = intervalByString(particleEncoded, atomEncoded)
    const fieldValueEncoded = cbor.encode(particle[key])
    const intervalInParticle = intervalByString(fieldValueEncoded, particleEncoded)
    intervalInParticle.startsAtByte += particleIntervalInAtom.startsAtByte
    return intervalInParticle
}

const writeBytes = (values: number[], buf: Buffer): number => {
    let offset = 0
    for (const value of values) {
        buf.writeInt16BE(value, offset)
        offset += 2
    }
    return offset
}
