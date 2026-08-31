# PostgreSQL persistence foundation

The dashboard uses Drizzle ORM with `pg` and PostgreSQL. Drizzle keeps the schema explicit in TypeScript, generates reviewable SQL migrations, supports the partial active-alert index directly, and adds little runtime abstraction. Prisma is not used.

Collection remains intentionally manual. Page rendering does not invoke persistence, and `GET /api/monitoring/snapshots` continues to fetch live agent data.

## Local setup

Install PostgreSQL using the package/service manager appropriate for your operating system, then create a role and database. For example, from a PostgreSQL administrator session:

```sql
CREATE ROLE noc_dashboard LOGIN PASSWORD 'choose-a-local-password';
CREATE DATABASE noc_dashboard OWNER noc_dashboard;
```

Copy the example variables to an ignored `.env.local` and set the server-only connection string:

```dotenv
DATABASE_URL=postgresql://noc_dashboard:choose-a-local-password@127.0.0.1:5432/noc_dashboard
```

`DATABASE_URL` has no `NEXT_PUBLIC_` prefix and is read only by the migration tools and modules under `lib/server/`. Do not commit `.env.local`.

Apply migrations and invoke one trusted-registry collection cycle:

```bash
npm run db:migrate
npm run monitoring:collect
```

For continuous manual collection, run:

```bash
npm run monitoring:collector
```

The collector runs a cycle immediately, then waits 20 seconds after each cycle finishes before starting the next one. Set `NOC_COLLECTION_INTERVAL_SECONDS` to a positive finite number of at least 5 seconds to override that interval. Run only one authoritative collector process at a time; distributed coordination is intentionally not part of this phase. Press Ctrl+C for graceful shutdown: an active cycle is allowed to finish, while an idle collector stops promptly. Automatic OS startup and deployment integration are intentionally deferred.

Generate a reviewed migration after future schema edits with `npm run db:generate`. Inspect data with `psql "$DATABASE_URL"` or, for local development, `npm run db:studio`.

## Schema

The initial migration creates:

- `monitored_device`: durable UUID plus unique operator-defined stable key and current configuration state.
- `device_inventory`: one current observed identity row per device; first/last observation times are retained.
- `service_definition`: explicit configured checks with unique `(device_id, stable_key)` and a type/target check constraint. Credentials and query strings are rejected before a URL is stored.
- `collection_run`: manual cycle status and sanitized aggregate outcome.
- `device_observation`, `system_telemetry_sample`, `network_telemetry_sample`, and `service_observation`: time-stamped observations correlated to a run.
- `alert_instance`: one row per continuous alert occurrence.
- `alert_state_transition`: only lifecycle transitions (`null -> active` and `active -> recovered`).

Status columns use PostgreSQL enums. Telemetry indexes are device/service plus descending observation time. Byte totals and uptime use PostgreSQL `bigint` and JavaScript `bigint`; percentages use bounded precision numeric columns. Unavailable endpoint names use bounded JSON data rather than storing errors or stack traces.

The migration adds a partial unique index on `alert_instance(condition_key) WHERE status = 'active'`. Recovered occurrences may therefore share a condition key, while two active occurrences cannot.

## Stable identity

Device stable keys come from the trusted registry (`macbook-air`, `linux-mint-acer`) and are never IP addresses. Service keys are derived from explicit check targets, not display names:

- TCP: `tcp:<normalized-host>:<port>`
- HTTP(S): `<scheme>:<normalized-host>:<effective-port>:<normalized-path>`

HTTP(S) normalization allows only HTTP/HTTPS and rejects userinfo, query strings, and fragments to avoid persisting credentials. This is a collector-owned compatibility strategy for the current agent contract; a future explicit immutable service key from configuration would allow target edits without creating a new service identity.

## Manual cycle and transactions

`runPersistedMonitoringCycle()` creates the run record, fetches the existing registry snapshots, evaluates the existing real-alert rules, then uses one database transaction to upsert identities, insert observations/telemetry, reconcile services and alerts, and complete the run. Disabled/not-fetched devices are registered but create no observation. If the transaction fails it rolls back and the run is marked failed with a generic summary.

Repository functions live under `lib/server/repositories/`; ORM calls do not appear in routes or React components. The `pg` pool is cached on `globalThis` during development to avoid hot-reload connection growth.

Concurrent active-alert creation is protected by the partial unique index. An insert conflict updates the winning active occurrence rather than creating another row. Lifecycle transitions and alert updates share the cycle transaction. This foundation assumes one authoritative collector process; it deliberately does not add a distributed lease. Conflicting concurrent cycles with different evidence require a future coordination design.

## Recovery evidence

Absence from the evaluator output is not sufficient to recover an alert:

- Agent unreachable recovers after a reachable (`online` or `partial`) snapshot.
- Partial telemetry recovers only after a fully `online` snapshot.
- Service down recovers only when the services endpoint succeeds and the same stable service reports `up`.
- CPU, memory, and disk alerts recover only when system telemetry succeeds and the relevant value is below its threshold.
- Missing endpoints never prove recovery.
- Maintenance and disabled snapshots leave active lifecycle rows untouched; suppression is not recovery.

Repeated positive observations update `last_observed_at`, message/current value, and `observation_count`. A recovered condition that later returns creates a new `alert_instance` with the same condition key.

## Current limitations

Collection has no automatic OS startup or deployment scheduling, and there is no locking/lease system, retention, historical UI, acknowledgement, notification, authentication, or incident workflow in this persistence path. The database is not yet the device registry. The current agent lacks an explicit immutable service ID, and its byte-capacity fields may be absent; corresponding memory/disk byte columns remain nullable until supplied.
