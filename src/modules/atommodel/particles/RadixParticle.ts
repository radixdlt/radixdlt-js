import { RadixSerializableObject, RadixQuark, RadixSerializer, includeJSON, includeDSON } from '../RadixAtomModel'

@RadixSerializer.registerClass('PARTICLE')
export class RadixParticle extends RadixSerializableObject {

    @includeJSON @includeDSON
    public quarks: RadixQuark[] = []

    constructor(...quarks: RadixQuark[]) {
        super()
        this.quarks = quarks
    }

    public getQuarkOrError<T extends RadixQuark>(type: new (...args: any[]) => T): T {
        for (const quark of this.quarks) {
            if (quark instanceof type) {
                return quark
            }
        }

        throw new Error(`Failed to get quark of type "${type.name}"`)
    }

    public getQuarks<T extends RadixQuark>(type: new (...args: any[]) => T): T[] {
        return this.quarks.filter((quark: RadixQuark) => quark instanceof type) as T[]
    }

    public containsQuark(type: {new(...args: any[]): RadixQuark}) {
        for (const quark of this.quarks) {
            if (quark instanceof type) {
                return true
            }
        }

        return false
    }

    public getAddresses() {
        throw new Error('Particle implementations must override this method!')
    }
}
