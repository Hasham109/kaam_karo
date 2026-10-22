# services/api/src/modules

One folder per backend module of the modular monolith (ARCH §4, BP §32, D-001).
**No cross-module table access** (INFRA-001): a module talks to another only through that
module's public `index.ts` (service interface) or through domain events (ARCH §4.1).
The ESLint rule `kaamkaro/no-cross-module-import` (infra/eslint) fails on deep imports
into another module's files.

Only `health` exists after T2.1. Each owner creates its folder in its own task.

| Folder                          | ARCH §4 module                                                     | Owner (IMPL §2.3) |
| ------------------------------- | ------------------------------------------------------------------ | ----------------- |
| `health`                        | Platform health (REL-011)                                          | A01               |
| `identity`                      | M1 Identity & Access                                               | A02               |
| `profiles`                      | M2 Profiles                                                        | A02               |
| `trust`                         | M3 Verification & Trust                                            | A05               |
| `catalog`                       | M4 Catalog                                                         | A03               |
| `config`                        | M17 Admin Ops & Config (ConfigRule store)                          | A03               |
| `availability`                  | M5 Availability & Service Area                                     | A05               |
| `location`                      | M6 Location                                                        | A06               |
| `intake`                        | M7 Request & AI Intake                                             | A07               |
| `voice`                         | Voice assistant (ARCH §10.3)                                       | A07               |
| `matching`                      | M8 Matching                                                        | A05               |
| `booking`                       | M9 Booking & Job                                                   | A04               |
| `quotes`                        | M10 Quotes & Fare                                                  | A04               |
| `payments`                      | M11 Payments & Settlement                                          | A09               |
| `reviews`                       | M12 Reviews & Reputation                                           | A10               |
| `chat`                          | M13 Communication                                                  | A10               |
| `media`                         | M14 Media                                                          | A08               |
| `notifications`                 | M15 Notifications                                                  | A10               |
| `support`                       | M16 Support & Disputes                                             | A10               |
| `audit`, outbox, analytics sink | M18 Audit & Events, M19 Analytics (library in `packages/platform`) | A01               |

Module layout (suggested): `index.ts` (public API only), `<name>.module.ts`,
`<name>.controller.ts`, `<name>.service.ts`, `*.spec.ts` (unit), `*.e2e-spec.ts` (API),
`__regression__/` (A17). Test titles start with `[REQ-ID]` (docs/qa/test-strategy.md §3.1).
