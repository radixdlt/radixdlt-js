import { RadixUniverseConfig, RadixNodeDiscovery } from '../..';

export interface RadixBootstrapConfig {
    universeConfig: RadixUniverseConfig,
    nodeDiscovery: RadixNodeDiscovery,
    finalityTime: number,
}
