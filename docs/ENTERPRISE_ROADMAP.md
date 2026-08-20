# CureFit Enterprise Roadmap

## Purpose and decision principle

The uploaded enterprise roadmap identifies valuable capabilities beyond CureFit’s current booking system: waitlists, transactional credits and payments, multi-instance scaling, verified attendance, and personalized scheduling. CureFit already has authoritative SQL row locking, an active-booking uniqueness safeguard, Redis availability acceleration, audit history, real-time seat updates, and a polling fallback. The next steps must extend those guarantees rather than replace them.

> **Core rule:** SQL remains the source of truth for durable reservations, credits, promotions, and attendance. Redis may accelerate queueing, locking, fan-out, and rate control, but Redis-only state must never be the only record of a member’s contractual reservation or credit balance.

## Current capability map

| Proposed capability                         | Existing CureFit foundation                                                        | Readiness         | Required decision or dependency                                                      |
| ------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------ |
| Full-class waitlist                         | Redis client, transactional bookings, cancellation workflow, WebSocket seat events | **Design-ready**  | Promotion policy, expiry interval, and member acceptance semantics                   |
| Class credit wallet                         | MySQL-compatible schema, atomic booking transaction, audit logging                 | **Schema-ready**  | Package catalog, cancellation penalty window, and accounting policy                  |
| Stripe purchases and webhooks               | Secure server routes and validation patterns                                       | **Gated**         | Stripe integration, signing secret, refund policy, and webhook reconciliation design |
| Distributed checkout coordination           | Redis and database row locks                                                       | **Scale-gated**   | Multiple API instances, Redis topology, observability, and lock-fencing design       |
| Read/write database split                   | Drizzle data access layer and cached catalog reads                                 | **Scale-gated**   | Replica infrastructure, lag budget, read-after-write routing policy                  |
| Beacon or geofence check-in                 | Attendance history and authenticated server API                                    | **Product-gated** | Mobile client, consent, venue hardware, location-privacy policy, and abuse controls  |
| Recommendations and scheduling intelligence | Booking and attendance history                                                     | **Data-gated**    | Retention policy, feature definitions, measurement plan, and notification consent    |

## Phase A — durable waitlist foundation

The lowest-risk enterprise increment is a **durable waitlist foundation**. A Redis ZSET can provide fast FIFO ordering, but the source-of-truth queue should be persisted in SQL so it survives cache eviction, Redis downtime, deployment restarts, and audit review. Redis can mirror the next eligible candidate after the database record is committed.

The first schema migration should add a `waitlist_entries` table with `userId`, `classId`, `status`, `joinedAt`, `promotionToken`, `offerExpiresAt`, and lifecycle timestamps. A unique active entry per `(userId, classId)` should prevent duplicate queue positions. Required statuses are `waiting`, `offered`, `accepted`, `expired`, `canceled`, and `promoted`.

| Design choice         | Recommended decision                                                           | Reason                                                                                       |
| --------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Fairness ordering     | SQL `joinedAt`, then immutable `id`                                            | A stable durable order is recoverable and auditable                                          |
| Promotion method      | Offer with a short acceptance window                                           | Auto-booking can create unwanted reservations or charge a credit without member confirmation |
| Cancellation behavior | Transactionally select and offer the next candidate after the seat is released | Preserves the existing row-locked seat invariant                                             |
| Redis usage           | Cache next candidate and publish promotion events after commit                 | Keeps Redis an optimization, not a transactional authority                                   |
| Notification          | WebSocket event plus polling-visible offer state                               | Works for connected clients and the existing fallback mode                                   |

Before implementation, product approval is needed for offer expiry, acceptance window, whether an offer holds a seat, cancellation penalties, and whether a member can join multiple overlapping waitlists.

## Phase B — credit ledger before payments

Credits should be implemented as an **append-only ledger**, not as a mutable counter alone. A cached wallet balance can be maintained for reads, but every purchase, booking debit, cancellation refund, manual adjustment, and chargeback should have a ledger entry with an idempotency key, actor, reason, and reference to the associated booking or Stripe event.

The booking transaction must lock the wallet and class rows in a fixed order, verify at least one available credit, decrement the balance, create the booking, create the attendance entry, and insert a credit-ledger debit. If the transaction fails, no credit movement commits. A permitted cancellation uses the same transaction to mark the booking canceled, restore capacity or create a waitlist offer, and write the corresponding refund ledger entry.

> **Do not enable payment collection until the ledger and idempotency model are complete.** A Stripe webhook may be delivered more than once or out of order; a webhook event table with a unique provider-event identifier is required before credits are minted.

Stripe remains a gated integration because it requires a configured payment account and secrets. Once approved, enable the project payment capability, request the webhook signing secret through the managed secret workflow, validate raw webhook payloads, persist each event idempotently, and reconcile ledger entries against provider events.

## Phase C — scale only with evidence

The current SQL row lock is authoritative for seat inventory. Moving to multiple API instances should first measure lock wait time, connection saturation, seat-cache divergence, request latency, and WebSocket fallback rates. A distributed lock is not a substitute for the database transaction or its unique constraint.

| Scaling proposal             | Introduce when                                                   | Required safeguards                                                                               |
| ---------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Redlock-style admission lock | Multiple API instances show measurable hot-class lock contention | Short TTL, ownership token, fencing or version check, metrics, and SQL lock retained as authority |
| Read replicas                | Catalog and history reads demonstrably contend with writes       | Explicit primary reads after writes, replica-lag monitoring, and graceful primary fallback        |
| Always-on hosting            | Long-lived real-time connections are a product requirement       | Capacity plan, health checks, reconnect budget, and cost approval                                 |
| Background promotion workers | Waitlist volume requires asynchronous offer expiry or fan-out    | Idempotent job keys, durable work records, retry policy, and operator visibility                  |

The existing multiplexed WebSocket and five-second polling fallback should remain part of every scaling step. Continuous WebSockets should be enhanced only when the deployment environment supports upgrades reliably.

## Phase D — verified attendance and privacy

Attendance automation should begin with a trainer-assisted, server-authorized check-in endpoint before Bluetooth or GPS automation. The endpoint should require a valid active booking, a class-time window, an authorization rule for the trainer or member, and an audit record. This establishes an accurate attendance domain model without making location data a prerequisite.

Location and Bluetooth verification require a separate product and privacy design. It must define consent, minimum data collection, retention and deletion periods, venue-beacon registration and rotation, spoof detection, manual fallback, and accessibility alternatives. The application should store verification outcome and evidence classification rather than persistent raw coordinates unless there is a documented legal and operational need.

## Phase E — decision support before machine learning

Start recommendations with transparent rules rather than an opaque predictive model. Examples include suggesting another upcoming class in the same category after a full class, surfacing a member’s historically attended time slot, and alerting opted-in members when a waitlist offer or favorite category opens. Each recommendation should show the reason in the UI and be measurable through acceptance and attendance outcomes.

Predictive capacity adjustments should be introduced only after data quality, seasonality handling, fairness review, and human owner override controls are in place. Capacity changes must preserve physical-room safety limits and should never automatically exceed the configured class capacity.

## Delivery sequence and acceptance gates

| Milestone                | Scope                                                                   | Acceptance gate                                                          |
| ------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1. Waitlist design       | Policies, schema draft, API contract, UI states                         | Owner approval of offer and expiry behavior                              |
| 2. Waitlist delivery     | Durable queue, offer/accept lifecycle, audit records, real-time notices | Race tests prove no duplicate offer or overbooked class                  |
| 3. Credit ledger         | Wallet, ledger, debit/refund transactions, idempotency                  | Booking and cancellation tests prove balance never drops below zero      |
| 4. Stripe integration    | Package checkout, signed webhook handler, reconciliation view           | Test events are idempotent and ledger reconciliation is visible to Owner |
| 5. Scaling               | Metrics, profiling, capacity decision, optional replica/lock plan       | Load evidence justifies each infrastructure change                       |
| 6. Attendance automation | Authorized check-in and audit first; privacy-reviewed proximity later   | Manual fallback and consent requirements verified                        |
| 7. Personalization       | Rule-based suggestions, consented notifications, measurement            | Recommendations are explainable and can be disabled by members           |

## Validation additions

Every enterprise change must retain the current booking safety contract: `pnpm check`, `pnpm test`, `pnpm build`, `pnpm test:compose`, and the one-success/ninety-nine-conflict concurrency test. New transactional capabilities add focused checks for wallet non-negativity, webhook idempotency, one active waitlist entry per member/class, one promotion per released seat, ordered offer expiry, and read-after-write consistency.

## Required approvals before feature implementation

The waitlist foundation can move into implementation after approval of the promotion policy. Payments require an explicit Stripe decision and secure credentials. Distributed locks, replicas, always-on hosting, beacon validation, and machine-learning scheduling require concrete scale evidence or policy decisions; they should not be introduced speculatively.
