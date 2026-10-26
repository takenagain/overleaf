# Dependency upgrade, 25 October 2026

The fork's `main` tracks upstream `overleaf/overleaf:main`. Fork configuration
and dependency migrations live on `staging` so the existing fast-forward sync
remains possible.

## Versions and compatibility

All 28 current npm manifests and their overrides were checked against the
registry's latest releases. The lockfile was refreshed recursively as well.
The upgrade includes React 19, Express 5, Mongoose 9, MongoDB driver 7,
Redis client 6, connect-redis 10, PDF.js 6, Uppy 6, Babel 8, Vitest 5,
Cypress 16 and current GitHub Actions pinned to release commit hashes.

The application now runs Node.js 26 (verified with 26.12.1), Yarn 4.18.1,
Ubuntu 26.04 and TeX Live 2026. Compose declares MongoDB 9.0.4 and Redis
8.8.3. Hunspell 1.7.5 was rebuilt with Emscripten 6.0.13.
See [runtime-upgrades.md](runtime-upgrades.md) before upgrading existing data.
No running deployment or persistent volume was upgraded during this work.

Type checks use the native TypeScript 7.0.2 compiler through
`tools/type-check.mjs`. ESLint's current parser still needs the TypeScript 6
JavaScript API, supplied separately through the official `@typescript/typescript6`
alias. The Java bridge retains Java 21 bytecode compatibility and was verified
with Maven 3.10.0, JDK 27 and Git 2.53.0. Its formatter dependency is updated for
JDK 27's compiler API.

The custom Overleaf Socket.IO protocol forks remain at their latest Overleaf
release tags; dictionaries and editor forks use their current supported source
revisions. These are intentionally different packages/protocols from the npm
Socket.IO implementation. Transitive libraries retain the API versions required
by their owners, including the legacy XML signature API used inside SAML.
Both XML signature versions have explicit XML MIME types and signature/tampering
regression checks. The deprecated `request` entry now aliases the maintained
`postman-request` implementation, also used by the upgraded retry wrapper.

## Application and publishing changes

The former GHCR build extended a released ShareLaTeX image and did not include
this repository's source. The workflow now builds the native base and application
from the checkout, connects stages by immutable image digests, installs the
fork's TeX extras, checks the image and then publishes its branch/SHA tags.

Compatibility migrations preserve request validation, OAuth/SAML parsing,
Redis session TTL and NX/XX safeguards, editor layout persistence, legacy
translation plural resources, uploads, PDF destruction, and ZIP downloads.
Obsolete dependency patches are removed; retained patches are rebased and
covered by focused integration tests.

## Validation boundaries

Verification includes immutable Yarn installation, production webpack and Pug
compilation, real Hunspell spelling, PDF parsing, ZIP extraction, OAuth redirects
and callbacks with request protection on/off, XML signing and tamper rejection,
HTTP error handling, Redis adapter/session tests, and MongoDB-backed rate limits.
The Java bridge passes all 130 tests and its formatting/package checks.

The available frontend run passes 1,599 tests, with one existing pending test.
Ten additional tests expect private settings/sidebar modules absent from the
public upstream repository. Other full-suite and TypeScript checks also reference
absent SaaS modules, story helpers, and `webpack.config.dev`; those checks are
not reported as passing. No private features, fake production implementations,
or committed test exclusions were introduced to hide these limitations.

Use the repository's unit commands with `NODE_ENV=test` and `TZ=UTC`. Mongo
cleanup helpers require the database name `test-overleaf`; use disposable test
instances. The normal deployment configuration must not be used for tests.
