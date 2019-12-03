import { RadixUniverseConfig, RadixNodeDiscovery } from '../..'

export interface RadixBootstrapConfig extends RadixPartialBootstrapConfig {
    universeConfig: RadixUniverseConfig,
}

export interface RadixPartialBootstrapConfig {
    nodeDiscovery: RadixNodeDiscovery,
    finalityTime: number,
}
