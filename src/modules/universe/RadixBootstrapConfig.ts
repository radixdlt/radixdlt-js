import { RadixUniverseConfig, RadixNodeDiscovery } from '../..';

export interface RadixBootstrapConfig extends PartialRadixBootstrapConfig {
    universeConfig: RadixUniverseConfig,
}

export interface PartialRadixBootstrapConfig {
    nodeDiscovery: RadixNodeDiscovery,
    finalityTime: number,
}
