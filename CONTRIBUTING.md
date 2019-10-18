# Contributing to radixdlt-js

### Table of contents
- [Code of conduct](#code-of-conduct)
- [Get started](#get-started)
  - [Reporting a bug](#reporting-a-bug)
- [Contribute](#contribute)
  - [Code structure](#code-structure)
  - [Testing](#testing)
  - [Linting](#linting)
  - [Opening a pull request](#opening-a-pull-request)
  

## Code of conduct

This project adheres to the Contributor Covenant [code of conduct](CODE_OF_CONDUCT.md).
By participating, you are expected to uphold this code.
Please report unacceptable behavior to [hello@radixdlt.com](mailto:hello@radixdlt.com).

## Get started

### Reporting a bug

* **Ensure the bug was not already reported** by searching on GitHub under [Issues](https://github.com/radixdlt/radixdlt-js/issues).
* If you're unable to find an open issue addressing the problem, [open a new one](https://github.com/radixdlt/radixdlt-js/issues/new). Be sure to include:
  * a **title**,
  * a **clear description**, 
  * as much **relevant information** as possible,
  * a **code sample** or an **executable test case** demonstrating the expected behavior that is not occurring.

## Contribute

    Package manager - let's use [yarn only](https://yarnpkg.com/lang/en/)


### Code structure

    Code style:
        Single quote strings, 4 spaces indentation, no semicolons
        Use editorconfig plugin for your IDE to enforce consistency https://editorconfig.org/
        Follow tsconfig and tslint recommendations(make sure to install IDE plugins for Typescript)
    All new public methods must have a tsdoc(if possible add one to old methods as well when working on them) https://github.com/microsoft/tsdoc

### Testing

    Tests:
        Unit tests go next to the module being tested
        Integration tests go in to test/integration 

### Code structure

    [Don't use default exports](https://basarat.gitbooks.io/typescript/docs/tips/defaultIsBad.html)
    Export everything that needs to be public in `src/index.ts`
    Everything in src/modules/atommodel  must be exported through `src/modules/atommodel/index.ts`.  The atommodel classes should have no references to any other parts of the project. This is to avoid a circular dependency issues, and potentially split out the atommodel into a separate package in the future
    Here's a [good way to do singletons in JS/TS](https://k94n.com/es6-modules-single-instance-pattern) see an example in `RadixUniverse.ts`.
    
### Opening a pull request

* Fork the codebase and make changes.
* Submit a new GitHub pull request with the proposed patch for review.
* Ensure the **pull request** description clearly describes the problem and solution. Include the relevant issue number if applicable.





    Commit message style https://radixdlt.atlassian.net/wiki/spaces/~62383862/pages/532021252/Git+commit+messages
    Git Branching strategy https://radixdlt.atlassian.net/wiki/spaces/RLAU/pages/522420225/Radix+Git+Branching+strategy
