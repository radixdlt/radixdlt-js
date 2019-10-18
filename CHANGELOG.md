# Changelog
All notable changes to this project will be documented in this file.
 
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0-beta.5](https://github.com/radixdlt/radixdlt-js/releases/tag/2.0.0-beta.5) - 2019-10-01

### Removed

* Remove the `serializer` field from atom hash to match `release/1.0-beta.2` of the Radix engine

## [2.0.0-beta.4](https://github.com/radixdlt/radixdlt-js/releases/tag/2.0.0-beta.4) - 2019-09-19

### Added

* Implement a RadixLedger component, which acts as a centralized caching layer between the network and the clients. It also manages finality calculations
 
## [2.0.0-beta.3](https://github.com/radixdlt/radixdlt-js/releases/tag/2.0.0-beta.3) - 2019-08-19

### Added

* Add error message when trying to transfer to self

### Changed

* Consolidate RadixNodeDiscoveryHardcoded and RadixNodeDiscoveryHardcodedSecure
* Split Fixed and Mutable supply token particles to match latest core update
