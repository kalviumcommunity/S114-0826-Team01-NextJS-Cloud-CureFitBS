# CureFit Architecture Reconciliation

## Purpose

The uploaded master prompt describes a **PERN-style** booking application. CureFit already implements the requested booking, cache, real-time, role, audit, and attendance capabilities in a production-oriented TypeScript project. This document records how that prompt maps to the implemented system and identifies intentional differences that should not be replaced without a planned migration.

> **Decision:** Preserve the existing React, Express, Drizzle, MySQL-compatible, Redis, and `ws` stack. Replacing it with a separate PostgreSQL monorepo or an in-memory SQLite fallback would add migration risk without improving the atomic booking guarantees already covered by the application tests.

## Architecture Mapping

| Uploaded requirement                                                                | CureFit implementation                                                                                                             | Status                         |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| React, Express, Node.js application                                                 | React 19 client, Express 4 server, and Node.js runtime in one TypeScript workspace                                                 | Implemented                    |
| PostgreSQL or MariaDB relational persistence                                        | Drizzle ORM with `mysql2`; managed MySQL-compatible database and optional MariaDB 11.4 local stack                                 | Implemented with MariaDB/MySQL |
| Redis availability gate and rate limiting                                           | `ioredis` Lua inventory reservation/release plus Redis-backed login rate limiting; safe degradation when Redis is unavailable      | Implemented                    |
| Atomic checkout and cancellation                                                    | Transactional `SELECT ... FOR UPDATE`, non-negative seat constraint, active-booking uniqueness safeguard, and atomic seat recovery | Implemented                    |
| WebSocket room broadcasts and fallback                                              | `ws` room subscriptions, multiplexed class updates, heartbeats, bounded recovery, and five-second HTTPS polling fallback           | Implemented and optimized      |
| JWT, role gating, bcrypt, and Zod validation                                        | Custom JWT, Customer/Owner authorization helpers, bcrypt verification, and reusable Zod validation middleware                      | Implemented                    |
| Attendance worker                                                                   | Deterministic reconciliation worker with authenticated scheduled callback integration                                              | Implemented                    |
| Owner roster, inventory management, and change history                              | Owner class controls, roster queries, audit logs, and grouped audit summaries                                                      | Implemented                    |
| Dark responsive catalog, confirmation modal, conflict toast, and attendance history | CureFit dark UI, exact seat labels, 540×640 confirmation modal, conflict recovery, tabs, and pagination                            | Implemented                    |
| 100-request concurrency verification                                                | `pnpm test:concurrency` asserts exactly one `201` and ninety-nine `409` results for a one-seat fixture                             | Implemented                    |

## Intentional Differences

| Prompt proposal                                 | CureFit decision                                               | Rationale                                                                                                                                 |
| ----------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Separate `backend/` and `frontend/` directories | Single full-stack TypeScript workspace                         | Shared typing through tRPC and the existing managed deployment contract reduce boundary duplication.                                      |
| PostgreSQL-specific partial unique index        | MySQL-compatible generated active-booking key and unique index | Matches the deployed database dialect while enforcing the same active-reservation invariant.                                              |
| In-memory SQLite database fallback              | No SQL-dialect fallback in application runtime                 | SQLite cannot faithfully reproduce the deployed locking and constraint behavior used to prove overbooking protection.                     |
| Backend Dockerfile and containerized API        | Host-run Node application with Compose backing services        | The checked-in Compose file intentionally provides only local MariaDB and Redis; the managed deployment supplies the application runtime. |
| Per-class WebSocket connections                 | One multiplexed subscription for displayed class rooms         | Reduces connection churn and eliminates the reconnect noise caused by opening a socket for every card.                                    |

## Validation Contract

Run the following commands before changing concurrency, persistence, caching, or real-time code:

```bash
pnpm check
pnpm test
pnpm build
pnpm test:compose
pnpm test:concurrency
```

The concurrency script requires class ID `4` to start with exactly one seat. A successful run reports one `201` reservation and ninety-nine `409` conflicts. The host-side MariaDB and Redis workflow is documented in [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md).

## Migration Guardrails

Any future move to PostgreSQL, a two-package monorepo, or a containerized API should be handled as an explicit migration project. It must preserve row locking, the active-booking uniqueness invariant, Redis reconciliation, WebSocket fallback behavior, audit history, and the 100-request concurrency assertion before replacing the current architecture.
