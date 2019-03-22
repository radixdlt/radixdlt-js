import { RadixFungible, RadixOwnable, RadixResourceIdentifier, RadixParticle } from '../..';
import BN from 'bn.js'

export interface RadixConsumable extends RadixParticle, RadixFungible, RadixOwnable {
    getTokenDefinitionReference(): RadixResourceIdentifier,
    getGranularity(): BN,
}
