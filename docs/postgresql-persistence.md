# PostgreSQL persistence foundation

The dashboard uses Drizzle ORM with `pg` and PostgreSQL. Drizzle keeps the schema explicit in TypeScript, generates reviewable SQL migrations, supports the partial active-alert index directly, and adds little runtime abstraction. Prisma is not used.

Collection remains intentionally manual. Page rendering does not invoke persistence, and `GET /api/monitoring/snapshots` continues to fetch live agent data.

The two monitoring paths are deliberately separate in this phase:

```text
Agents -> independent Collector -> PostgreSQL
PostgreSQL -> server-side persisted monitoring read layer
```

The real-monitoring sections on Overview, Devices, Alerts, and Analytics use this persisted read layer when its server-only capability is enabled. The deterministic demo fleet remains separate and unchanged. Direct agent snapshots are retained only as a private-lab diagnostic path.

## Deployment-safe capability

`NOC_PERSISTED_MONITORING_ENABLED` is strictly parsed and server-only. Only `true` enables persisted reads. `false`, a missing value, or an invalid value produces the safe `disabled` state without initializing a PostgreSQL pool. If enabled without `DATABASE_URL`, or if a configured read fails, the state is `unavailable`. A successful read is `available`.

The recommended Vercel configuration today is:

```dotenv
NOC_PERSISTED_MONITORING_ENABLED=false
```

`DATABASE_URL` is not required in that mode. Overview, Devices, Alerts, and Analytics continue to render their demo sections and show an intentional Real Monitoring Lab message. Disabled and unavailable APIs return sanitized `503` responses rather than fake empty datasets. Database failure never changes a device to unreachable, creates an alert, or creates zero-coverage reliability data.

Local/private-lab mode uses both settings:

```dotenv
NOC_PERSISTED_MONITORING_ENABLED=true
DATABASE_URL=postgresql://...
```

A future production monitoring deployment requires a reachable secured datastore or ingestion design. Do not expose private agents using router port forwarding, and do not make a public Vercel deployment depend on LAN URLs.

## Persisted current-state reads

`getPersistedMonitoringState()` is a server-only data-access function behind the typed capability boundary. Its repository uses set-based queries to load registered devices, the latest device observation, the latest successfully persisted system and network samples, every service definition with its latest observation, active alert instances, and the latest completed or partial collection run. Timestamp ties are resolved deterministically by UUID in descending order. A read-only diagnostic endpoint is available at `GET /api/monitoring/persisted`; it is dynamic, sends `Cache-Control: no-store`, omits service targets, and returns a typed sanitized 503 rather than database details on disabled/unavailable paths.

Pages call that server-side abstraction for their initial render. A narrowly scoped client subtree polls the persisted endpoint every 10 seconds without overlapping requests. The collector's default 20-second write interval is independent: reading the dashboard never invokes agents or starts a collection. `GET /api/monitoring/snapshots` still fetches agents directly for diagnostics.

Current availability comes only from the latest device observation. System and network values independently retain their last successfully persisted sample, including its real observation timestamp. Consequently, a later unreachable observation does not erase earlier telemetry or make it appear current.

Freshness is evaluated on the server against a centralized 60-second policy:

- `fresh`: a sample exists and is at most 60 seconds old.
- `stale`: a sample exists and is more than 60 seconds old.
- `unavailable`: no sample exists.

The same representation describes collection freshness using the latest completed/partial run time. Operational state (`monitored`, `maintenance`, or `disabled`) remains separate from observed availability. Reads do not evaluate alerts, invent service status, or manufacture state for maintenance/disabled devices. Services without observations have a `null` latest observation, and only PostgreSQL `active` alert instances are returned.

When the collector is stopped, stored availability is not rewritten and no outage is fabricated. Collection freshness and sample freshness age into `stale`, while the dashboard continues to show timestamped last-known telemetry. A temporary persisted API failure similarly preserves the browser's last successful state and displays a refresh warning.

PostgreSQL `bigint` telemetry fields become exact base-10 strings in the read DTO. This keeps the internal function and diagnostic JSON endpoint serializable without narrowing values beyond JavaScript's safe integer range.

## Persisted historical reads

The historical read model is separate from the current-state read model. Current state answers “what is the latest persisted state?”; `getMonitoringHistory()` returns bounded, persisted PostgreSQL time series and alert occurrences for one device selected by its stable key. The read-only diagnostic endpoint is `GET /api/monitoring/history/[deviceKey]?hours=24`.

The server calculates an inclusive `[from, to]` window using its current time. The default is 24 hours, the minimum is 1 hour, and the maximum is 168 hours (7 days). Invalid or non-finite values are rejected. Queries return exact sample timestamps in chronological order with UUID tie-breaking, do not interpolate gaps or fabricate zeroes, and do not downsample yet. The repository is structured by telemetry stream so future aggregation can be introduced without changing the public device-history contract.

Every configured service definition is returned, even when it has no observations in the window, but target hosts, ports, and URLs are omitted. Network totals and system uptime cross the JSON boundary as exact decimal strings. Alert history uses occurrence overlap rather than start-time-only filtering: an occurrence is included when `first_observed_at <= window.to` and it has not recovered or `recovered_at >= window.from`. Thus both active and recovered outages spanning either boundary are represented without mutating lifecycle state.

This historical layer is read-only. It does not interpolate missing telemetry, and its existing UI behavior remains separate from reliability analytics.

## Reliability analytics

`getMonitoringReliability()` is the server-only calculation/read foundation for one device and the same bounded history window. Its sanitized diagnostic endpoint is `GET /api/monitoring/reliability/[deviceKey]?hours=24`. It returns every persisted service definition without targets, even when that service has no observations. This is monitoring analytics, not a contractual SLA or SLO calculation. The `/analytics` UI presents the real persisted result separately from demo analytics, pairs observed availability with coverage and unknown time, and supports fixed 1h, 6h, 24h, and 7d windows.

Monitoring coverage and observed availability are intentionally separate. A high observed availability with low coverage means only that the known evidence was mostly healthy; it does not make the unknown part of the window healthy. Missing collection runs, sleeping collectors, failed persistence, and sparse telemetry therefore remain UNKNOWN rather than becoming UP or DOWN. This is why the calculation does not use `UP sample count / total sample count`: samples represent state evidence over time, not equally sized time buckets.

The centralized maximum evidence gap is initially 60 seconds. An observation establishes state at its timestamp and carries it forward over the half-open interval `[observation, min(next observation, observation + 60 seconds))`. Intervals are clipped to the requested `[from, to]` analysis window. The repository also reads observations from the 60 seconds immediately before `from`, allowing recent boundary evidence to carry into the window; older evidence cannot. The final observation never extends beyond either the evidence gap or `to`. An explicit `not-fetched` device observation contributes no evidence and cuts off prior carried state.

Device observation semantics are explicit:

- `online` is available.
- `partial` is available but degraded and is exposed separately.
- `unreachable` is unavailable.
- `not-fetched` is unknown.

The device headline availability is `(available + degraded) / all known device-observed time`. Operational state remains an independent field: maintenance and disabled state neither manufacture uptime nor downtime. Device observation evidence also supplies the top-level monitoring coverage metric. Service availability is `UP / (UP + DOWN)` over known service-observed time. Unknown time is excluded from both availability denominators but included in each coverage denominator and returned explicitly. With no evidence, coverage is 0%, the entire window is unknown, and observed availability is `null`, not a misleading 0%.

Service observations provide coverage and time-weighted UP/DOWN availability. Persistent service-category `alert_instance` rows independently provide outage occurrence analytics. One alert instance is one occurrence regardless of its condition key or number of repeated DOWN observations. Recovered and active instances overlapping the window are counted separately, and active instances never receive a fabricated recovery time.

Recovered downtime inside the requested window is clipped to the overlap of `[firstObservedAt, recoveredAt]` and `[from, to]`. Longest recovered outage and mean time to recovery use each recovered instance's full persisted `firstObservedAt` to `recoveredAt` duration, including an occurrence that started before the window; this preserves actual recovery duration while the separate downtime total remains window-specific. MTTR and longest recovered outage are `null` when no recovered occurrence intersects the window.

Duration arithmetic uses integer milliseconds until DTO serialization to seconds. Percentages are calculated from duration totals and normalized to at most six decimal places, leaving display rounding to future presentation code.

## Local setup

Install PostgreSQL using the package/service manager appropriate for your operating system, then create a role and database. For example, from a PostgreSQL administrator session:

```sql
CREATE ROLE noc_dashboard LOGIN PASSWORD 'choose-a-local-password';
CREATE DATABASE noc_dashboard OWNER noc_dashboard;
```

Copy the example variables to an ignored `.env.local` and set the server-only connection string:

```dotenv
DATABASE_URL=postgresql://noc_dashboard:choose-a-local-password@127.0.0.1:5432/noc_dashboard
NOC_PERSISTED_MONITORING_ENABLED=true
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

The collector is intended to be a long-running process. It runs a cycle immediately, then waits 20 seconds after each cycle finishes before starting the next one. Set `NOC_COLLECTION_INTERVAL_SECONDS` to a positive finite number of at least 5 seconds to override that interval. Press Ctrl+C for graceful shutdown: an active cycle is allowed to finish, no new cycle starts, an idle wait is interrupted, and the PostgreSQL pool closes. Automatic OS startup and systemd deployment integration are intentionally deferred.

Operational output is one-line JSON suitable for later ingestion from `journalctl`. Startup records the effective interval, PID, and safe Node.js runtime information. Each cycle records its start and a completion summary containing the persisted run status, timestamps, duration, attempted/succeeded/failed device counts, and detected-alert count. Unexpected failures use a bounded category instead of raw exception or database text and report the normal retry delay. Logs never intentionally include `DATABASE_URL`, agent URLs, service targets, credentials, or raw environment values.

Only one authoritative collector should run. The command takes an exclusive, owner-only lock file in the operating system temporary directory and refuses a second collector on the same host. The file records a PID so a lock left by an abnormally terminated process can be recovered; graceful shutdown removes it. This is lightweight local accident protection, not a security boundary: temporary-directory and PID semantics vary by operating system, PID reuse can conservatively delay recovery, and hosts do not coordinate their locks. Distributed/PostgreSQL advisory locking is not implemented. Existing database constraints remain authoritative for integrity, and PostgreSQL remains the source of persisted monitoring state.

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

Collection has no automatic OS startup or deployment scheduling, distributed locking/lease system, retention, SLA breach logic, acknowledgement, notification, authentication, or incident workflow in this persistence path. Local process locking only prevents ordinary duplicate starts on the same host. The database is not yet the device registry. The current agent lacks an explicit immutable service ID, and its byte-capacity fields may be absent; corresponding memory/disk byte columns remain nullable until supplied.
