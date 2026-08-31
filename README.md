# NOC Dashboard

A portfolio-quality Network Operations Center dashboard for monitoring a small enterprise or school network. It presents infrastructure health, device inventory, network telemetry, alerts, incidents, and reliability analytics in a responsive dark operations interface.

The dashboard combines its original deterministic demonstration pages with persisted FastAPI-agent monitoring. Real monitoring follows `Agents → Independent Collector → PostgreSQL → Dashboard`; the demonstration fleet remains separate and deterministic.

## Capabilities

- Responsive application shell with collapsible desktop navigation and a mobile drawer
- Operational overview with derived device, alert, latency, bandwidth, and health metrics
- Searchable device inventory with status/type filters and device detail dialogs
- Traffic, latency, packet-loss, capacity, and network-condition analysis
- Alert console with search, severity/status filters, details, and session acknowledgements
- Typed incident management records with ownership, duration, root-cause context, and alert correlation
- Real persisted reliability analytics covering observed availability, monitoring coverage, unknown time, service outage occurrences, and MTTR, kept separate from existing demo analytics
- Demonstration settings for monitoring thresholds, notification routing, and display density
- Accessible status labels, semantic tables, keyboard-friendly dialogs, visible focus states, and responsive mobile alternatives

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Current network posture and recent operational activity |
| `/devices` | Monitored-device inventory and telemetry details |
| `/network` | Traffic, latency, packet loss, and capacity analysis |
| `/alerts` | Alert triage and session-only acknowledgement workflow |
| `/incidents` | Deterministic incident queue and investigation context |
| `/analytics` | Reliability, health, utilization, and alert patterns |
| `/settings` | Local demonstration preferences and system information |

## Technology

- Next.js 16 App Router
- React 19
- TypeScript with strict checking
- Tailwind CSS 4
- Recharts 3
- PostgreSQL with Drizzle ORM
- Lucide React icons

## Architecture

The root layout supplies fonts and metadata. A route-group layout at `app/(noc)/layout.tsx` applies the shared application shell without adding a URL segment.

Route pages remain React Server Components. They import deterministic records from `data/`, call pure derivation helpers in `lib/`, and pass typed serializable props into reusable components. Client Components are limited to browser interactions such as:

- Sidebar and mobile-drawer state
- Search, filters, native dialogs, and demonstration acknowledgement/settings state
- Responsive Recharts visualizations and tooltips

The real-monitoring subtrees on Overview, Devices, and Alerts receive their initial sanitized current state from PostgreSQL during server rendering, then poll `GET /api/monitoring/persisted` approximately every 10 seconds. The independent collector writes on its separate default 20-second cadence. Browser requests never trigger collection. If collection stops, the UI retains last-known observations and telemetry while clearly marking collection and sample freshness as stale. If a browser refresh fails, the last successful response remains visible.

`GET /api/monitoring/snapshots` remains available as a direct-agent diagnostic endpoint, but normal dashboard rendering and polling do not depend on it.

The Analytics page server-renders a 24-hour reliability result for the first persisted device, then fetches the reliability API only on device/window changes or manual refresh. Availability is always paired with evidence coverage and unknown time. Service observed DOWN evidence is sample-derived, while recovered outage duration and MTTR come from persistent alert occurrence timestamps; MTTR excludes active outages. These are monitoring analytics, not contractual SLA/SLO calculations.

Domain contracts live in `types/network.ts`. Mock devices, alerts, activity, incidents, and time-series samples are separated into focused modules under `data/`. Dashboard, telemetry, incident, analytics, formatting, and semantic-status calculations live under `lib/`, keeping components independent of the mock source.

Persisted byte counters cross JSON as exact decimal strings and are formatted without unsafe integer narrowing.

## Run locally

Requirements: a current Node.js release compatible with Next.js 16 and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Run code-quality and production checks:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

For database setup, migrations, schema details, alert recovery rules, and the manual persisted collection command, see [docs/postgresql-persistence.md](docs/postgresql-persistence.md).

## Demonstration limitations

- All monitoring records are local, fixed mock data.
- Alert acknowledgements and Settings changes are harmless client-side state and reset without persistence.
- Refresh intervals, thresholds, and notification preferences do not configure real infrastructure.
- Persistence collection is manual and unscheduled; historical UI, notification delivery, and authentication are not implemented.

The interface labels the environment as demo monitoring to avoid representing simulated telemetry as live operations.

## Planned live-monitoring architecture

A production evolution can preserve the current UI and domain contracts while adding:

1. A Linux monitoring agent or collector for ICMP, SNMP, interface, host-resource, and service checks.
2. An authenticated ingestion API that validates and normalizes agent observations.
3. Persistent storage for devices, telemetry, alerts, incidents, operators, and acknowledgement history.
4. Server-side aggregation and threshold evaluation using the same concepts represented by the current pure helpers.
5. Streaming or polling updates, notification delivery, audit trails, and role-based access.

The project is structured for GitHub source control and a standard Vercel Next.js deployment. Deployment would publish the demonstration UI only until external monitoring services and persistent infrastructure are configured.
