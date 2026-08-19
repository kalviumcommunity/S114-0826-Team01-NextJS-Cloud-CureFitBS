# CureFit Real-Time Class Booking & Attendance System

CureFit is a full-stack fitness-class booking application with atomic seat reservations, real-time availability updates, attendance history, cancellation, Owner operations, audit logging, and MySQL-compatible persistence.

## Local Architecture

The optional local environment deliberately mirrors the application’s implemented persistence stack: **MariaDB 11.4** for the MySQL-compatible Drizzle schema and **Redis 7.4** for availability and rate-limit caching. The checked-in Compose file provisions only these two backing services. The CureFit Node application runs on the host through `pnpm dev` at `http://localhost:3000`; it is not an API-container definition and does not provide PostgreSQL or a port-5000 backend container.

For the complete local setup, environment template, and migration instructions, see [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md).

For a requirement-by-requirement mapping between the uploaded master architecture prompt and this implementation, including deliberate stack decisions, see [ARCHITECTURE_RECONCILIATION.md](./ARCHITECTURE_RECONCILIATION.md).

For the phased enterprise roadmap covering waitlists, credits and payments, scaling, attendance verification, and personalization, see [ENTERPRISE_ROADMAP.md](./ENTERPRISE_ROADMAP.md).

## Host-Side Docker Stack Verification Guide

> The managed development sandbox does not run a nested Docker daemon. Run the following commands on a host with Docker Engine or Docker Desktop, Docker Compose, Node.js 22+, and pnpm installed.

### 1. Prepare and Boot the Backing Services

Copy the safe template to a local-only `.env` file, then start MariaDB and Redis.

```bash
cd /path/to/curefit-booking
cp local-environment.template.txt .env
docker compose up -d mysql redis
docker compose ps
```

The status table should show the `mysql` and `redis` services as `running (healthy)`. Default port mappings are `3306:3306` for MariaDB and `6379:6379` for Redis; values can be overridden through `.env`.

| Service | Image              | Health command                                  | Persistent volume    |
| ------- | ------------------ | ----------------------------------------------- | -------------------- |
| `mysql` | `mariadb:11.4`     | `healthcheck.sh --connect --innodb_initialized` | `curefit_mysql_data` |
| `redis` | `redis:7.4-alpine` | `redis-cli ping`                                | `curefit_redis_data` |

### 2. Confirm Service Health and Inspect Initialization Logs

Use the following commands to confirm both services answer inside their Compose network and to inspect any startup failure.

```bash
docker compose exec mysql healthcheck.sh --connect --innodb_initialized
docker compose exec redis redis-cli ping
docker compose logs --tail=100 mysql redis
```

The MariaDB health command must exit successfully and Redis must print `PONG`. The service logs should not contain initialization failures.

### 3. Apply the Schema and Start the CureFit Application

Load the local settings before applying the Drizzle migration, then start the Node process on the host in a separate terminal.

```bash
set -a
source .env
set +a
pnpm db:push
pnpm dev
```

The development server should report that it is running on `http://localhost:3000`. In another terminal, confirm the catalog endpoint responds.

```bash
curl --fail http://localhost:3000/api/classes
```

### 4. Run the Verification Suite and Concurrency Race

With the backing services healthy and the application running, verify the static Compose contract, type checks, tests, production build, and the 100-request booking race.

```bash
pnpm test:compose
pnpm check
pnpm test
pnpm build
pnpm test:concurrency
```

`pnpm test:concurrency` requires class ID `4` to begin with exactly one available seat. A passing run prints the following result shape, where `successCount` is `1` and `conflictCount` is `99`.

```json
{
  "classId": 4,
  "requests": 100,
  "successCount": 1,
  "conflictCount": 99
}
```

### 5. Stop or Reset the Local Stack

Stop the services while preserving local data, or remove the disposable local volumes only when a clean reset is intended.

```bash
docker compose down
# Destructive: deletes local MariaDB and Redis data.
docker compose down -v
```
