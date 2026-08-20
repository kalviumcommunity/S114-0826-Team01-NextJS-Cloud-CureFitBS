Product Requirements Document: CureFit Real-Time Class Booking & Attendance System

Document status: Implementation-ready baseline

Product: CureFit

Primary stack: React 19, TypeScript, Tailwind CSS 4, Express 4, tRPC 11, Drizzle ORM, MariaDB/MySQL-compatible SQL, Redis, WebSockets, JWT, Vitest

Version: 1.0


1. Product Summary

CureFit is a full-stack fitness-class booking and attendance application. Members browse scheduled classes, view live seat availability, reserve an available seat, cancel an eligible booking, and review attendance history. Owners manage classes, inspect rosters, and review operational audit records.

The core product guarantee is that a class can never be overbooked. SQL is the durable source of truth for reservations and inventory. Redis accelerates availability checks, login rate limiting, and real-time fan-out, but it must never be the only record of a contractual reservation, attendance state, or future credit balance.


Non-negotiable booking rule: a successful reservation must atomically reserve exactly one seat, create exactly one active booking for the member and class, and write the associated audit and attendance records. When no seat remains, the API must return an explicit conflict without changing inventory.

2. Goals

Goal
Description
Success Measure
Reliable booking
Prevent overbooking during simultaneous requests.
A 100-request race for one seat yields exactly 1 success and 99 conflicts.
Clear availability
Display accurate seat status with live updates or a safe polling fallback.
Catalog status refreshes after bookings and cancellations.
Safe cancellation
Allow authorized member cancellation while recovering inventory atomically.
Seat count and booking state remain consistent after cancellation.
Operational visibility
Give Owners class controls, rosters, and audit history.
Owner-only endpoints and UI controls are authorization tested.
Responsive UX
Provide skeletons, typed toasts, and bounded retry for safe reads.
Loading and error states are clear without repeating mutations.
Extensible platform
Support a future waitlist, wallet, payments, and verified attendance without replacing booking safety.
Future changes preserve existing concurrency and data invariants.


3. Non-Goals

The following are not part of the baseline release and must not be introduced without an explicit product and infrastructure decision.

Deferred capability
Reason for deferral
Automatic payment collection
Requires an approved Stripe account, refund policy, webhook signing secret, and idempotent credit ledger.
Redis-only waitlist authority
Durable membership queues must survive Redis eviction and restarts.
Distributed lock as a replacement for SQL locking
The SQL transaction and active-booking uniqueness protection remain authoritative.
Database read replicas
Introduce only after measured read/write contention and a defined replica-lag policy.
Bluetooth, GPS, or beacon attendance enforcement
Requires mobile support, consent, retention rules, accessibility fallback, and venue hardware policy.
Opaque machine-learning recommendations
Begin with transparent, measurable, opt-in rules.




4. Users and Permissions

Role
Capabilities
Guest
May view public catalog data where permitted; cannot book or view private history.
Customer
Can authenticate, book eligible classes, cancel own eligible bookings, and view own attendance history.
Owner
Has Customer capabilities plus class creation and inventory controls, class roster visibility, audit-log access, and operational summaries.




All role checks must be enforced on the server. Hiding an interface control is never a substitute for authorization.

5. Functional Requirements

5.1 Class Catalog

The main catalog must display the current class schedule as responsive cards. Each card must show the class category, image, title, coach, location, schedule, capacity, availability badge, and booking action.

Availability labels must use these exact states:

Availability
Badge text
Visual state
More than 3 seats
X SEATS LEFT
Green
1–3 seats
X SEATS LEFT
Orange
0 seats
CLASS FULL
Red




The catalog must show an accessible skeleton while the initial class query is pending. The first visible card images should be prioritized, while below-the-fold images use lazy loading.

5.2 Booking

A signed-in Customer or Owner may request a booking for an available class. The client submits a booking request to the server and must not decrement seats optimistically before server confirmation.

The server booking flow must:

1.
Authenticate the JWT and identify the caller.

2.
Validate the request payload with Zod.

3.
Apply a Redis availability short-circuit only as an optimization.

4.
Start a SQL transaction.

5.
Lock the requested class row with SELECT ... FOR UPDATE.

6.
Re-read durable seat availability inside the transaction.

7.
Reject with a conflict if no seat remains.

8.
Enforce one active booking per member and class.

9.
Decrement inventory, insert the booking, insert attendance history, and write audit information in the same transaction.

10.
Commit, then refresh Redis availability and publish the post-commit seat update.

On success, the UI must show a booking confirmation modal and a visual success toast. On a sold-out conflict, the UI must display this exact message:


Class Just Filled Up! Another member reserved the last seat milliseconds before your request.

The conflict is an expected business outcome. It must be displayed as a handled toast and must not be reported as an unhandled API mutation error.

5.3 Cancellation

A Customer may cancel only their own eligible active booking. Cancellation must execute atomically: mark the booking and attendance record as canceled, restore one seat exactly once, update Redis after commit, broadcast a seat update, and create the audit entry.

When cancellation refers to a stale row, the UI must clear stale attendance state, refresh attendance and catalog data, and show a recovery notice. Ownership protection must remain in force even when the client cache is stale.

5.4 Attendance History

The attendance dashboard must show the authenticated user’s history with pagination and filter tabs:

Filter
Included records
All
Every attendance record visible to the caller.
Attended
Confirmed attendance.
Canceled
Canceled booking records.
Upcoming
Future active bookings.




Attendance and Owner queries should remain disabled until the member opens the corresponding view, preventing unnecessary background work while browsing the catalog.

5.5 Owner Operations

Owner capabilities include:

•
Creating a class with validated capacity and schedule fields.

•
Updating class inventory only through safe server-side controls.

•
Viewing a roster for a selected class.

•
Viewing chronological audit logs.

•
Viewing grouped audit summaries.

All Owner mutations must be role-gated, validated, audited, and covered by authorization tests.

5.6 Authentication and Security

The application uses JWT authentication with Customer and Owner roles. Password-based demo credentials use bcrypt verification where applicable. Login attempts are rate-limited with Redis to five attempts per IP per fifteen-minute window.

The system must use secure error responses. It must not disclose password hashes, connection strings, JWT secrets, provider tokens, or internal stack traces to users.

6. Real-Time and Resilience Requirements

6.1 Live Seat Updates

The application provides a multiplexed WebSocket subscription for class seat updates. Clients should maintain one shared subscription instead of opening one socket per catalog card. Messages include seat updates and heartbeat traffic.

If WebSocket upgrades are unavailable in a preview or deployment gateway, the client must not retry endlessly. It should use bounded recovery attempts, show an intelligible fallback state, and refresh safe catalog reads every five seconds while periodically attempting recovery.

Suggested status text:

Condition
User-facing status
Healthy socket
Live sync
Recovering connection
Reconnecting live sync
Fallback mode
Syncing every 5 seconds




6.2 Request Retry Policy

Only idempotent, safe read requests may retry automatically. Retry behavior must use bounded exponential backoff with jitter where practical.

Request type
Automatic retry
Rationale
Catalog and class reads
Yes
Reads can safely retry after intermittent failure.
Attendance history reads
Yes
Reads can safely retry after intermittent failure.
Owner read-only reports
Yes
Reads can safely retry after intermittent failure.
Login
No
Avoid confusing repeated credential attempts and rate-limit behavior.
Booking
No
A repeated mutation could create confusing business outcomes; require an explicit retry action.
Cancellation
No
Require explicit member action and current data refresh.
Owner mutations
No
Owner should explicitly retry after reviewing the error.




6.3 Toast Notification System

Use typed, accessible toasts for all meaningful user outcomes. The system must support success, error, warning, and info variants.

Event
Toast type
Example message
Booking confirmed
Success
Booking confirmed. Your seat is reserved.
Booking conflict
Error / alert
Exact required “Class Just Filled Up!” message.
Cancellation confirmed
Success
Booking canceled. Your seat has been released.
Stale booking state
Warning
This booking changed. Your attendance data has been refreshed.
Read request recovery
Info
Connection restored. Latest class availability is shown.
Unexpected server error
Error
We could not complete that request. Please try again.




7. User Experience and Visual Requirements

The UI is dark mode by default and uses the CureFit brand palette.

Token
Value
Use
Page background
#0b0e14
App shell
Card background
#161b22
Class and operational cards
Brand green
#00df89
Primary actions and healthy availability
Hot-seat orange
#ff8c00
Low availability
Alert red
#f85149
Full classes, destructive alerts, conflict notices
Typography
Inter
UI typeface




The booking confirmation modal must be 540 × 640 px on desktop, adapt responsibly on smaller screens, be keyboard reachable, and return focus to the initiating control after dismissal.

All nonessential animation must respect prefers-reduced-motion. Use brief, transform-and-opacity transitions; do not animate layout dimensions for routine interactions.

8. Data Model

The durable schema is MySQL-compatible and managed with Drizzle.

Entity
Key fields
Invariants
users
id, email, role, passwordHash, identity metadata
Roles are Customer or Owner.
classes
id, title, coach, capacity, availableSeats, schedule, location
availableSeats is never negative.
bookings
id, userId, classId, status, bookingReference
At most one active booking per member/class.
attendanceHistory
id, bookingId, status, checkInTime
Attendance lifecycle is tied to a booking.
auditLogs
actor, action, target, metadata, timestamps
Owner and operational mutations remain traceable.




Future tables must be introduced through a schema-first migration workflow:

1.
Modify drizzle/schema.ts.

2.
Generate and inspect the migration SQL.

3.
Apply the migration through the managed SQL workflow.

4.
Update data-access helpers, API validation, UI contracts, and tests.

9. API and Server Requirements

The server exposes REST endpoints and tRPC procedures. All inputs must be validated with Zod. Server code must return consistent HTTP and tRPC errors without leaking internal details.

Required API domains

Domain
Required behavior
Authentication
JWT issuance, role lookup, rate-limited login, logout.
Catalog
Class listing and class detail reads with cache-aware availability.
Booking
Atomic reservation, conflict mapping, cache synchronization, and real-time publish.
Cancellation
Ownership checked, atomic seat recovery, audit record, and real-time publish.
Attendance
Filtered history, pagination, safe reconciliation updates.
Owner
Class management, roster, audit logs, and audit summary.
Realtime
Room subscription, heartbeat, multiplexed class events, graceful fallback.




10. Local Development Requirements

The local backing-service stack uses MariaDB 11.4 and Redis 7.4. The Node application runs on the host at http://localhost:3000; the Compose file does not define an API container.

Bash


cd /path/to/curefit-booking
cp local-environment.template.txt .env
docker compose up -d mysql redis
set -a && source .env && set +a
pnpm db:push
pnpm dev



Use the following validation commands before sharing or publishing changes:

Bash


pnpm check
pnpm test
pnpm build
pnpm test:compose
pnpm test:concurrency



The concurrency test requires class ID 4 to start with exactly one available seat and must produce one success and ninety-nine conflicts from one hundred simultaneous requests.

11. Quality and Acceptance Criteria

11.1 Booking Safety




A fully booked class never receives an additional booking.




Concurrent requests for a single seat produce exactly one successful reservation.




Cancellation restores capacity exactly once.




A member cannot maintain duplicate active bookings for the same class.




Cache loss or cache staleness cannot override the SQL seat decision.

11.2 Authentication and Authorization




Unauthenticated booking and cancellation requests are rejected.




A Customer cannot cancel another member’s booking.




Customer access to Owner operations is rejected.




Login rate limiting protects repeated failed attempts.

11.3 User Experience




Initial catalog loading displays accessible skeleton cards.




Booking success, booking conflict, cancellation, stale-state recovery, and unexpected errors show appropriate visual toasts.




Expected booking conflicts are not logged as unhandled mutation errors.




Safe reads retry with bounded exponential backoff; mutations do not auto-retry.




WebSocket unavailability switches to clear polling fallback instead of endless reconnects.




The catalog, attendance dashboard, and Owner controls remain usable at desktop and mobile sizes.

11.4 Regression Contract




TypeScript validation passes.




All Vitest tests pass.




Production build passes.




Compose manifest validation passes.




Concurrency test passes with one success and ninety-nine conflicts.

12. Future Delivery Roadmap

Phase A: Durable Waitlist

Implement a SQL-backed waitlist_entries table with userId, classId, status, joinedAt, promotionToken, offerExpiresAt, and lifecycle timestamps. Use Redis only to accelerate queue access after the durable record commits.

Required policy decisions before implementation:

•
Offer expiry duration.

•
Acceptance window and whether an offer temporarily holds a seat.

•
Cancellation penalty rules.

•
Whether overlapping waitlists are allowed.

The safe default is an offer-and-accept flow, not automatic booking. A released seat selects the next waiting member inside a SQL transaction, creates an offer, records audit data, publishes a notification after commit, and expires the offer through an idempotent worker.

Phase B: Credit Ledger and Payments

Implement an append-only credit ledger before enabling payment collection. Every purchase, booking debit, cancellation refund, manual adjustment, and chargeback needs a reason, actor, related booking or provider event, and idempotency key.

Stripe is gated until the team approves packages and refunds, configures provider credentials, validates raw webhooks, and persists webhook event IDs idempotently.

Phase C: Evidence-Based Scaling

Measure connection saturation, lock waits, catalog latency, cache divergence, and fallback polling rates before adding replicas, distributed admission locks, or always-on hosting. SQL row locks and unique constraints remain authoritative after scaling.

Phase D: Verified Attendance

Start with an authenticated, trainer-authorized check-in endpoint and audit record. Add Bluetooth or location verification only after consent, retention, hardware registration, spoof prevention, accessibility fallback, and legal requirements are approved.

Phase E: Transparent Recommendations

Start with explainable rules—for example, suggest a similar class after a member encounters a full class. Require member notification consent, a disable option, measurable acceptance outcomes, and Owner override controls before predictive capacity changes.

13. Engineering Delivery Rules

1.
Do not replace a durable SQL invariant with a cache or client-side check.

2.
Treat cache invalidation, WebSocket messages, and retries as post-commit optimizations.

3.
Add a failing test before fixing a defect where practical.

4.
Keep mutation requests explicit and idempotent where external providers or background workers are involved.

5.
Add audit records for Owner actions and future financial or attendance-verification state changes.

6.
Validate with type checking, full tests, production build, Compose contract checks, and concurrency regression before checkpointing.

7.
Do not introduce payment, personal-location, or always-on infrastructure requirements without explicit owner approval.

14. Repository Reference

Document
Purpose
README.md
Application overview and local stack verification.
LOCAL_DEVELOPMENT.md
Local MariaDB/Redis setup instructions.
GIT_WORKFLOW.md
Branch, commit, push, and pull-request workflow.
ARCHITECTURE_RECONCILIATION.md
Mapping between external architecture prompts and CureFit’s implemented stack.
ENTERPRISE_ROADMAP.md
Gated phased plan for waitlist, payments, scaling, attendance, and personalization.
todo.md
Project work history and current delivery checklist.







Developer Start Prompt

Use this prompt in VS Code with your coding assistant when making changes:


You are extending CureFit, a React 19 + TypeScript + Express + tRPC fitness-class booking application. Preserve SQL as the source of truth for seat inventory and active bookings. Redis and WebSockets are optimizations only. Do not auto-retry mutations; apply bounded exponential backoff only to safe reads. Add or update Vitest coverage for every behavior change. Before completing work, run pnpm check, pnpm test, pnpm build, and pnpm test:compose; run pnpm test:concurrency when booking behavior changes. Follow the role rules, audit requirements, exact seat badge labels, and exact booking-conflict toast message defined in this PRD.

