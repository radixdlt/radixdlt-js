import cbor from 'cbor'
import { RadixAtom, RadixSpin, RadixTransferrableTokensParticle, RadixParticle } from 'radixdlt'

interface ByteInterval {
    startsAtByte: number,
    byteCount: number
}

/*
* Loops over the UP particles in an atom, and for each particle key/attribute
* finds the byte interval in the DSON encoded atom and writes them to a byte array.
*/
export function cborByteOffsetsOfUpParticles(atom: RadixAtom): Buffer {
    const upParticles = atom.getParticlesOfSpin(RadixSpin.UP)
    const bytes = []

    for (const particle of upParticles) {
        const byteIntervalOfKey = getByteIntervalFunction(particle, atom)

        for (const key of ['address', 'amount', 'serializer', 'tokenDefinitionReference']) {
            const interval = byteIntervalOfKey(key)
            bytes.push(interval.startsAtByte)
            bytes.push(interval.byteCount)
        }
    }
    return writeBytes(bytes, Buffer.from(''))
}

/*
* Get a byte interval function depending on the type of particle.
*
* For transferrable tokens particles, we use the regular byteIntervalInAtom method.
* In other cases, we need to add a special check.
*/
const getByteIntervalFunction = (particle: RadixParticle, atom: RadixAtom): (key: string) => ByteInterval => {
    if (particle.constructor.name === 'RadixTransferrableTokensParticle') {
        return byteIntervalInAtom(particle, atom)
    } else {
        return (key: string) => {
            if (key !== 'serializer') { return { startsAtByte: 0, byteCount: 0 } }
            return byteIntervalInAtom(particle, atom)(key)
        }
    }
}

/*
* Finds where a DSON encoded particle starts, and it's length, in a DSON encoded atom
* byte array.
*/
const intervalByString = (particleDSON: Buffer, atomDSON: Buffer): ByteInterval => {
    return {
        startsAtByte: atomDSON.toString('hex').indexOf(particleDSON.toString('hex')) / 2,
        byteCount: particleDSON.length,
    }
}

/*
* Finds the byte interval of a key value of a particle, in an atom.
*
* For example, it could look for the particle's 'address' key, and it would
* return where that value starts in the whole atom's byte array, and how many bytes
* it is. 
*/
const byteIntervalInAtom = (particle: RadixParticle, atom: RadixAtom) => (key: string): ByteInterval => {
    const particleEncoded = particle.toDSON()
    const atomEncoded = atom.toDSON()

    const particleIntervalInAtom = intervalByString(particleEncoded, atomEncoded)
    const fieldValueEncoded = cbor.encode(particle[key])
    const intervalInParticle = intervalByString(fieldValueEncoded, particleEncoded)
    intervalInParticle.startsAtByte += particleIntervalInAtom.startsAtByte
    return intervalInParticle
}

const writeBytes = (values: number[], buf: Buffer): Buffer => {
    for (const value of values) {
        const newValue = Buffer.alloc(2)
        newValue.writeInt16BE(value, 0)
        buf = Buffer.concat([
            buf,
            newValue,
        ])
    }
    return buf
}
