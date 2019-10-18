# Contributing to radixdlt-js

### Table of contents
- [Code of conduct](#code-of-conduct)
- [Get started](#get-started)
  - [Package manager](#package-manager)
  - [Reporting a bug](#reporting-a-bug)
- [Contribute](#contribute)
  - [Code structure](#code-structure)
  - [Testing](#testing)
  - [Code structure](#code-structure)
  - [Commit messages](#commit-messages)
  - [Opening a pull request](#opening-a-pull-request)
  

## Code of conduct

This project adheres to the Contributor Covenant [code of conduct](CODE_OF_CONDUCT.md).
By participating, you are expected to uphold this code.
Please report unacceptable behavior to [hello@radixdlt.com](mailto:hello@radixdlt.com).

## Get started

### Package manager 

We use [yarn only](https://yarnpkg.com/lang/en/).

### Reporting a bug

* **Ensure the bug was not already reported** by searching on GitHub under [Issues](https://github.com/radixdlt/radixdlt-js/issues).
* If you're unable to find an open issue addressing the problem, [open a new one](https://github.com/radixdlt/radixdlt-js/issues/new). Be sure to include:
  * a **title**,
  * a **clear description**, 
  * as much **relevant information** as possible,
  * a **code sample** or an **executable test case** demonstrating the expected behavior that is not occurring.

## Contribute



### Code structure

* Single quote strings, 4 spaces indentation, no semicolons
* Use [EditorConfig plugin](https://editorconfig.org/) for your IDE to enforce consistency
* Follow tsconfig and tslint recommendations (make sure to install IDE plugins for Typescript)
* All new public methods must have a [TSDoc](https://github.com/microsoft/tsdoc) (if possible add one to old methods as well when working on them) 

### Testing

* Unit tests go next to the module being tested
* Integration tests go in to test/integration 

### Code structure

* [Don't use default exports](https://basarat.gitbooks.io/typescript/docs/tips/defaultIsBad.html)
* Export everything that needs to be public in `src/index.ts`
* Everything in `src/modules/atommodel`  must be exported through `src/modules/atommodel/index.ts`. 
  * The `atommodel` classes should have no references to any other parts of the project. 
  * This is to avoid a circular dependency issues, and potentially split out the `atommodel` into a separate package in the future
* Here's a [good way to do singletons in JS/TS](https://k94n.com/es6-modules-single-instance-pattern). 
  * See an example in `RadixUniverse.ts`.
  
### Branching strategy

https://radixdlt.atlassian.net/wiki/spaces/RLAU/pages/522420225/Radix+Git+Branching+strategy


### Commit messages
  *  Separate subject from body with a blank line
  *  Limit the subject line to 50 characters
  *  Capitalise the subject line
  *  Do not end the subject line with a period
  *  Use the imperative mood in the subject line
  *  Wrap the body at 72 characters
  *  Use the body to explain what and why vs. how, separating paragraphs with an empty line.


### Opening a pull request

* Fork the codebase and make changes, following these guidelines.
* Submit a new GitHub pull request with the proposed patch for review.
* Ensure the **pull request** description clearly describes the problem and solution. Include the relevant issue number if applicable.


