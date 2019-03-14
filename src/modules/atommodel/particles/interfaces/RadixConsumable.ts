import { RadixFungible, RadixOwnable, RadixResourceIdentifier, RadixParticle } from '../..';
import BN from 'bn.js'

export interface RadixConsumable extends RadixParticle, RadixFungible, RadixOwnable {
    getTokenTypeReference(): RadixResourceIdentifier,
    getGranularity(): BN,
}
