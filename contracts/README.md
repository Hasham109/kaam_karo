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

| Contract            | Version | Owner | Requirement IDs                                                                                                        |
| ------------------- | ------- | ----- | ---------------------------------------------------------------------------------------------------------------------- |
| `health.yaml`       | 1.0.0   | A01   | REL-011                                                                                                                |
| `common.yaml`       | 1.1.0   | A01   | REL-001, REL-002, REL-006, REL-008, SEC-BASE-005 (components only: `ErrorEnvelope`, `Idempotency-Key`, `X-Request-Id`) |
| `catalog.yaml`      | 0.1.0   | A03   | SCOPE-CAT-001, SCOPE-CAT-002, SCOPE-GEO-002, CFG-RULE-001 (T2.6)                                                       |
| `config.yaml`       | 0.1.0   | A03   | CFG-RULE-001…012, SEC-BASE-010 (T2.6)                                                                                  |
| `identity.yaml`     | 0.1.0   | A02   | SEC-AUTH-001..008, ADMIN-ROLE-001..008 (T2.4)                                                                          |
| `profiles.yaml`     | 0.1.0   | A02   | PROF-ADDR-001..004, PROF-FAV-001, LOC-GEO-003..004, ROLE-001, ROLE-002 (T2.5)                                          |
| `location.yaml`     | 0.1.0   | A06   | LOC-GEO-001..006, LOC-GEO-008, SCOPE-GEO-001..002 (T3.1)                                                               |
| `media.yaml`        | 0.1.0   | A08   | MEDIA-004..007, MEDIA-009, INFRA-003 (T3.2)                                                                            |
| `availability.yaml` | 0.1.0   | A05   | AVAIL-001..007, TRUST-VER-001..004 (T3.6)                                                                              |
| `booking.yaml`      | 0.1.0   | A04   | BOOK-STATUS-001..017, BOOK-CANCEL-001..006, DATA-002, DATA-004 (T3.4)                                                  |
| `quotes.yaml`       | 0.1.0   | A04   | QUOTE-001..009, FARE-001..013, PRICE-001..007, BOOK-STATUS-010, COMM-003 (T3.5)                                        |

TODO(A01, T2.2+): generate TypeScript types from the contracts for apps and the API.
