# CureFit Local Development Guide

This guide explains how to run CureFit on a developer machine with the same MySQL-compatible database and Redis services used by the application architecture. It is intended for feature work, database-schema checks, endpoint testing, and the booking-concurrency demonstration.

IMPORTANT SCOPE

Docker Compose starts only the backing services: MariaDB and Redis. The CureFit Node.js server runs directly on your computer through `pnpm dev`; it is not defined as a Docker API container.

1. LOCAL ARCHITECTURE

| Component | Local implementation | Responsibility |
|---|---|---|
| Application server | Node.js host process, started with `pnpm dev` | Runs Express, tRPC, REST APIs, JWT authentication, booking transactions, and WebSocket updates. |
| Relational database | MariaDB 11.4 Docker service named `mysql` | Stores users, classes, bookings, attendance history, and audit logs. |
| Cache and rate-limit service | Redis 7.4 Docker service named `redis` | Supports seat-availability caching, Lua short-circuits, and login rate limiting. |
| Database access layer | Drizzle ORM with `mysql2` | Uses the project’s MySQL dialect against the local MariaDB service. |

MariaDB is used locally because it is MySQL-wire-compatible and matches the production MySQL/TiDB-compatible schema and queries. You write the same CureFit application code for local and managed environments.

2. PREREQUISITES

Install Docker Desktop or Docker Engine with the Docker Compose plugin, Node.js 22 or later, and pnpm. Confirm that the required tools are available.

```bash
docker compose version
node --version
pnpm --version
```

Go to the project folder.

```bash
cd /path/to/curefit-booking
```

3. INSTALL PROJECT DEPENDENCIES

```bash
pnpm install
```

Do not commit generated dependencies or local credentials. The repository’s `.gitignore` excludes `.env`.

4. CREATE THE LOCAL ENVIRONMENT FILE

Copy the safe environment template.

```bash
cp local-environment.template.txt .env
```

Set a non-empty local JWT secret before running the app.

```dotenv
JWT_SECRET=replace-with-a-long-random-local-development-secret
```

| Variable | Default value | Purpose |
|---|---|---|
| `MYSQL_DATABASE` | `curefit` | Name of the MariaDB database created by Compose. |
| `MYSQL_USER` | `curefit` | Non-root MariaDB user used by the application. |
| `MYSQL_PASSWORD` | `curefit_local_password` | Local MariaDB password. |
| `MYSQL_PORT` | `3306` | Host port exposed for MariaDB. |
| `DATABASE_URL` | `mysql://curefit:...@127.0.0.1:3306/curefit` | Drizzle and `mysql2` connection URL. |
| `REDIS_PORT` | `6379` | Host port exposed for Redis. |
| `REDIS_URL` | `redis://127.0.0.1:6379` | Redis connection URL used by the optional cache layer. |
| `JWT_SECRET` | Replace the template value | Token-signing secret for local JWT authentication. |

5. START MARIADB AND REDIS

```bash
docker compose up -d mysql redis
docker compose ps
```

Confirm service health.

```bash
docker compose exec mysql healthcheck.sh --connect --innodb_initialized
docker compose exec redis redis-cli ping
```

Expected results: a successful MariaDB health check and `PONG` from Redis.

| Service | Image | Default host port | Persistent volume | Health expectation |
|---|---|---:|---|---|
| `mysql` | `mariadb:11.4` | `3306` | `curefit_mysql_data` | InnoDB initialized and accepting connections. |
| `redis` | `redis:7.4-alpine` | `6379` | `curefit_redis_data` | `redis-cli ping` returns `PONG`. |

If a service is unhealthy, inspect its logs.

```bash
docker compose logs --tail=100 mysql redis
```

6. APPLY THE DATABASE SCHEMA

Load the local environment values and synchronize the Drizzle schema with local MariaDB.

```bash
set -a
source .env
set +a
pnpm db:push
```

The server performs best-effort demo seeding when it starts against an empty local database. This creates six demonstration classes for development and UI verification.

7. RUN THE CUREFIT APPLICATION

```bash
pnpm dev
```

Open the application in a browser:

```text
http://localhost:3000
```

In a separate terminal, verify the catalog endpoint.

```bash
curl --fail http://localhost:3000/api/classes
```

8. VALIDATE THE LOCAL SETUP

```bash
pnpm test:compose
pnpm check
pnpm test
pnpm build
```

BOOKING-CONCURRENCY DEMONSTRATION

Run the booking race test only after the application is running locally and class ID `4` has exactly one available seat.

```bash
pnpm test:concurrency
```

A correct result has this shape:

```json
{
  "classId": 4,
  "requests": 100,
  "successCount": 1,
  "conflictCount": 99
}
```

If the fixture has been used by a previous run, reset the disposable local database as described in Section 10, then repeat Sections 5–7.

9. EVERYDAY DEVELOPMENT WORKFLOW

| Order | Terminal | Command or action |
|---:|---|---|
| 1 | Terminal A | `docker compose up -d mysql redis` |
| 2 | Terminal B | `set -a && source .env && set +a` |
| 3 | Terminal B | `pnpm db:push` after a schema change |
| 4 | Terminal B | `pnpm dev` |
| 5 | Terminal C | Run `pnpm test`, endpoint checks, or concurrency tests. |

After changing `drizzle/schema.ts`, follow the project schema workflow: generate the migration, review its SQL, apply the required migration safely to the intended environment, and then retest. Do not use local schema commands against production credentials.

10. STOP, RESTART, OR RESET THE LOCAL STACK

Stop containers while keeping local data.

```bash
docker compose down
```

To remove the disposable local MariaDB and Redis data, run the following command. This is destructive to local data only.

```bash
docker compose down -v
```

After reset, start services, load `.env`, apply the schema, and start the app. Demo data is seeded when the empty local database is started by CureFit.

11. TROUBLESHOOTING

| Symptom | Likely cause | Resolution |
|---|---|---|
| `docker compose` is not found | Docker Compose is not installed or not on `PATH`. | Install Docker Desktop or Docker Engine with the Compose plugin, then reopen the terminal. |
| `port is already allocated` | Another local service is using `3306` or `6379`. | Stop the conflicting service or change `MYSQL_PORT` or `REDIS_PORT` in `.env`, then restart Compose. |
| MariaDB remains unhealthy | Initialization failed or a prior volume contains incompatible data. | Inspect `docker compose logs --tail=100 mysql`; if data is disposable, use `docker compose down -v` and start again. |
| Redis health check fails | Redis did not start correctly or its port is conflicted. | Run `docker compose logs --tail=100 redis`, resolve the port conflict, and restart the service. |
| `pnpm db:push` cannot connect | `.env` was not loaded, Compose is stopped, or `DATABASE_URL` is incorrect. | Load `.env`, confirm `docker compose ps`, and verify the database port. |
| The server does not use Redis | `REDIS_URL` is missing or Redis is unavailable. | Check `.env` and Redis health. Booking correctness still relies on SQL transactions; Redis is an optimization layer. |
| Concurrency test does not show 1/99 | Class ID `4` does not have exactly one available seat, or the local app is not running. | Reset the disposable local volumes, restart services, apply the schema, start the app, and rerun the test. |
| `curl` cannot reach the catalog | The Node server is not running or uses another port. | Check the `pnpm dev` output and use its displayed local URL. |

12. SECURITY AND ENVIRONMENT BOUNDARIES

Local values in `local-environment.template.txt` are disposable. Use a unique `JWT_SECRET` for every non-disposable environment, never commit `.env`, and never copy managed production secrets into local files.

MariaDB and Redis are development backing services only. They do not replace the managed production MySQL/TiDB-compatible database or alter the deployed CureFit environment.

