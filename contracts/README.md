# contracts/

Contract-first (ARCH §8 rule 7, IMPL §3.4): an endpoint or event is not used by anyone until it
is published here.

| Path                           | Content                                                       | Owner                                      |
| ------------------------------ | ------------------------------------------------------------- | ------------------------------------------ |
| `<module>.yaml`                | OpenAPI 3.1 for one backend module (ARCH §4 module names)     | Module owner (IMPL §2.3)                   |
| `events/<module>.<event>.json` | JSON Schema 2020-12 for one domain event (ARCH §7)            | Producing module owner                     |
| `__tests__/`                   | Contract tests (structure now; producer/consumer tests later) | A16 (structure test seeded by A01 in T2.1) |
| `src/`                         | Loader used by tests (`loadOpenApi`, `responseJsonSchema`)    | A01                                        |

Rules checked by `__tests__/structure.spec.ts`:

- OpenAPI version 3.1.x; `info.version` is semver.
- Every operation has an `operationId` and a non-empty `x-requirement-ids` list (ARCH §8 rule 8);
  every ID exists in `docs/requirements/REQUIREMENTS.md`.

Published contracts:

| Contract      | Version | Owner | Requirement IDs |
| ------------- | ------- | ----- | --------------- |
| `health.yaml` | 1.0.0   | A01   | REL-011         |

TODO(A01, T2.2+): generate TypeScript types from the contracts for apps and the API.
