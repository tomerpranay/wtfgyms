# WTF LivePulse — Real-Time Multi-Gym Intelligence Engine

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://www.postgresql.org/)
[![React](https://img.shields.io/badge/React-18-cyan.svg)](https://reactjs.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue.svg)](https://www.docker.com/)

**WTF LivePulse** is a production-grade, real-time multi-gym intelligence engine designed for the WTF Gyms operations team. It unifies live occupancy tracking, revenue tickers, background anomaly detection, analytics, data simulation, and native WebSocket streaming across 10 gym locations and 5,000 members.

---

## 1. Quick Start

Start the entire production stack (Database + Backend + Frontend) with a single command:

```bash
docker compose up
```

No manual database setup, migrations, or seeding are required. The container stack automatically initializes PostgreSQL 15, applies schema migrations, seeds 90 days of realistic multi-gym data (~270,000 check-ins, 5,000 members, 3 anomaly test scenarios), starts the background anomaly engine, and serves the frontend dashboard.

### Service Ports

* **Frontend Operations Dashboard**: [http://localhost:3000](http://localhost:3000)
* **Backend REST API**: [http://localhost:5000](http://localhost:5000)
* **Native WebSocket Endpoint**: `ws://localhost:5000/ws`
* **PostgreSQL Database**: `localhost:5432` (`user: wtfuser`, `password: wtfpassword`, `database: wtflivepulse`)

To test a cold start from scratch:

```bash
docker compose down -v
docker compose up
```

---

## 2. Architecture Decisions

### Database & Indexing Strategy

1. **PostgreSQL 15 as Single Source of Truth**: All operational events (check-ins, check-outs, payments, anomalies) flow directly into PostgreSQL. No transient in-memory state replaces the database.
2. **BRIN Index (`idx_checkins_time_brin`)**: Time-series check-in data naturally appends over time. A Block Range Index (BRIN) provides ultra-compact, high-speed range scans across ~270,000+ check-in rows with negligible indexing overhead.
3. **Partial Composite Index (`idx_checkins_live_occupancy`)**: The live occupancy query (`SELECT COUNT(*) FROM checkins WHERE gym_id = $1 AND checked_out IS NULL`) is executed frequently. By indexing `(gym_id, checked_out) WHERE checked_out IS NULL`, the index size remains tiny (only open sessions), enabling sub-0.5ms query execution.
4. **Partial Churn Index (`idx_members_churn_risk`)**: Filtered on `(last_checkin_at) WHERE status = 'active'`, allowing instant identification of active members at high (45–60 days) or critical (60+ days) churn risk without scanning inactive or frozen accounts.
5. **Composite Revenue Index (`idx_payments_gym_date`)**: Indexing `(gym_id, paid_at DESC)` optimizes single-gym today's revenue calculations (`< 0.8ms`).
6. **Materialized View (`gym_hourly_stats`)**: Eliminates expensive runtime `GROUP BY` aggregations over check-in history for the 7-day peak-hour heatmap. Indexed with a unique constraint `(gym_id, day_of_week, hour_of_day)` for `< 0.3ms` queries, refreshed periodically.

### Real-Time WebSocket Streaming

* **Native WebSockets (`ws`)**: Built with standard WebSocket protocol for low latency (< 1s UI updates).
* **Broadcast Protocol**: Emits structured JSON events (`CHECKIN_EVENT`, `CHECKOUT_EVENT`, `PAYMENT_EVENT`, `ANOMALY_DETECTED`, `ANOMALY_RESOLVED`).
* **Resilience**: The frontend custom hook includes automatic ping-pong heartbeats and auto-reconnect strategy upon disconnection.

### Background Engines

* **Anomaly Engine**: A dedicated Node.js background process evaluating zero check-ins during operating hours, capacity breaches (>90% capacity with auto-resolution <85%), and revenue drops (≥30% drop vs same day last week with auto-resolution <20%).
* **Simulator Engine**: A multi-speed (1x, 5x, 10x) event generator that writes actual `checkins`, `payments`, and member timestamps directly into PostgreSQL.

---

## 3. AI Tools Used

This project leveraged AI engineering assistants during development:

1. **Google Gemini 3.6 Flash**: Used as the primary architectural coding assistant for system design, query optimization, high-performance SQL batch seeding algorithms, React component design, Jest test suite generation, and technical documentation.
2. **Claude 3.5 Sonnet**: Used for validating technical assignment edge cases and verifying EXPLAIN ANALYZE index usage patterns.

---

## 4. Query Performance Benchmarks

All benchmark queries were executed using PostgreSQL `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)` against the full 90-day seeded dataset (5,000 members, ~270,000 check-ins, 5k–6k payments).

| # | Query Name | Target Time | Measured Execution Time | Index / Feature Used | Sequential Scan Status | Screenshot / Artifact |
|---|---|---|---|---|---|---|
| **Q1** | Live Occupancy (Single Gym) | `< 0.5ms` | `0.142 ms` | `idx_checkins_live_occupancy` (Partial) | ✅ NO SEQ SCAN | [q1_explain_analyze.txt](benchmarks/screenshots/q1_explain_analyze.txt) |
| **Q2** | Today's Revenue (Single Gym) | `< 0.8ms` | `0.218 ms` | `idx_payments_gym_date` (Composite) | ✅ NO SEQ SCAN | [q2_explain_analyze.txt](benchmarks/screenshots/q2_explain_analyze.txt) |
| **Q3** | Churn Risk Members | `< 1.0ms` | `0.384 ms` | `idx_members_churn_risk` (Partial) | ✅ NO SEQ SCAN | [q3_explain_analyze.txt](benchmarks/screenshots/q3_explain_analyze.txt) |
| **Q4** | Peak Hour Heatmap (7d) | `< 0.3ms` | `0.089 ms` | `gym_hourly_stats` Materialized View | ✅ NO SEQ SCAN | [q4_explain_analyze.txt](benchmarks/screenshots/q4_explain_analyze.txt) |
| **Q5** | Cross-Gym Revenue Comparison | `< 2.0ms` | `0.612 ms` | `idx_payments_date` (Covering) | ✅ NO SEQ SCAN | [q5_explain_analyze.txt](benchmarks/screenshots/q5_explain_analyze.txt) |
| **Q6** | Active Anomalies (All Gyms) | `< 0.3ms` | `0.115 ms` | `idx_anomalies_active` (Partial) | ✅ NO SEQ SCAN | [q6_explain_analyze.txt](benchmarks/screenshots/q6_explain_analyze.txt) |

---

## 5. Testing & Verification

### Running Unit & Integration Tests

```bash
cd backend
npm test
```

Includes 10+ Jest unit tests covering anomaly thresholds, auto-resolutions, and simulator logic, plus 12+ Supertest integration tests validating REST API endpoints, HTTP status codes, error states, and 403 Forbidden enforcement on critical anomaly dismissal.

### Running End-to-End Tests

```bash
cd frontend
npx playwright test
```

Includes Playwright E2E tests verifying dashboard loading, gym selector navigation, and live simulator activity streaming.

---

## 6. Known Limitations

1. **Authentication & RBAC**: Operating role management (e.g. Ops Manager vs Gym Owner) is out of scope for this assignment; all API endpoints are accessible within the local Docker network environment.
2. **Materialized View Concurrent Refresh**: In low-memory environments, initial materialized view refresh uses standard `REFRESH MATERIALIZED VIEW` until population is populated with a unique index.
