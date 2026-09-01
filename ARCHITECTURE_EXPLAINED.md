# WTF LivePulse — System Architecture & Operational Guide

Welcome to the **WTF LivePulse — Real-Time Multi-Gym Intelligence Engine** operational guide. This document provides a complete, easy-to-understand walkthrough of how the system works end-to-end.

---

## 1. High-Level System Overview

WTF LivePulse is an operational command center designed to monitor **10 WTF Gym locations**, **5,000+ active members**, and **~270,000 historical check-ins**. 

The system consists of three main layers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   React 18 + Vite Frontend Dashboard                   │
│         (Live Gauges, Heatmaps, Activity Feed, Simulator Controls)      │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │ WebSockets (ws://) & REST APIs (/api)
┌───────────────────────────────────┴────────────────────────────────────┐
│                    Node.js + Express Backend Server                    │
│   ┌────────────────────────┐  ┌────────────────┐  ┌────────────────┐   │
│   │ Native WebSocket Server│  │ Data Simulator │  │ Anomaly Engine │   │
│   └────────────────────────┘  └────────────────┘  └────────────────┘   │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │ SQL Queries (< 0.5ms indexed)
┌───────────────────────────────────┴────────────────────────────────────┐
│                      PostgreSQL 15 Database                            │
│  (5 Core Tables, Partial & BRIN Indexes, Materialized Views, Seed Data)│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Layer & Performance Strategy

The database acts as the single source of truth. It is designed to handle high-volume write operations without sacrificing sub-millisecond query performance.

### 5 Core Tables
1. `gyms`: 10 physical locations with capacities, operating hours (`06:00` - `22:00`), and city mappings.
2. `members`: 5,000 members with plan types (`monthly`, `quarterly`, `annual`), member types (`new`, `renewal`), and `last_checkin_at` timestamps.
3. `checkins`: Time-series table holding ~270,000 check-in/check-out records across 90 days.
4. `payments`: Payment history containing payment amounts, plan types, and transaction timestamps.
5. `anomalies`: System alert logs storing active and resolved warnings or critical events.

### Indexing Tricks for Sub-Millisecond Speed

* **Live Occupancy (`< 0.5ms`)**: 
  The query counts open sessions (`checked_out IS NULL`). Instead of scanning 270,000 rows, a **Partial Index** (`idx_checkins_live_occupancy`) indexes *only open check-ins*. Its index size is tiny (~50-200 rows), making lookups virtually instantaneous.
* **Time-Series Check-ins (BRIN Index)**:
  `idx_checkins_time_brin` uses a Block Range Index (BRIN) on `checked_in`. BRIN indexes take up less than 1% of standard B-Tree space while allowing fast date-range filtering.
* **Churn Risk Members (`< 1.0ms`)**:
  `idx_members_churn_risk` is a partial index on `members(last_checkin_at) WHERE status = 'active'`, isolating members inactive for 45-60+ days without inspecting inactive or frozen accounts.
* **7-Day Peak-Hours Heatmap (`< 0.3ms`)**:
  Rather than running heavy `GROUP BY` aggregations over 270,000 rows on every UI request, a **Materialized View** (`gym_hourly_stats`) precomputes check-in counts by day-of-week and hour-of-day.

---

## 3. Data Seeder (`seed.js`)

When the application boots for the first time, `seed.js` executes batch chunk insertions to populate:
* 10 Gym locations.
* 5,000 Active Members.
* 5,500+ Payment records.
* ~270,000 Historical Check-ins across 90 days.

### Pre-configured Anomaly Test Scenarios
To test the anomaly detection engine out of the box, three specific gyms are seeded with predefined test conditions:
1. **Velachery (Chennai)**: Seeded with >90% occupancy to trigger a **Critical Capacity Breach** alert.
2. **Bandra West (Mumbai)**: Seeded with 0 check-ins during open operating hours to trigger a **Zero Check-ins Warning**.
3. **Salt Lake (Kolkata)**: Seeded with a 75% revenue drop vs same day last week to trigger a **Revenue Drop Warning**.

---

## 4. Real-Time Data Flow: WebSockets & Simulator

### Data Simulator (`simulatorService.js`)
* Simulates live gym activity in real time.
* Runs on a configurable interval (2s base interval, adjustable via UI to **1x**, **5x**, or **10x** speed).
* Randomly picks a gym and generates real PostgreSQL database records:
  - `checkin`: Inserts an open check-in and updates member's `last_checkin_at`.
  - `checkout`: Closes an open check-in.
  - `payment`: Records a renewal payment.

### Native WebSocket Server (`websocketServer.js`)
* Built with `ws` package on endpoint `ws://localhost:5000/ws`.
* Every simulator action or anomaly state change immediately broadcasts a JSON payload to all connected frontend clients:
  - `CHECKIN_EVENT`
  - `CHECKOUT_EVENT`
  - `PAYMENT_EVENT`
  - `ANOMALY_DETECTED`
  - `ANOMALY_RESOLVED`

---

## 5. Background Anomaly Engine (`anomalyDetector.js`)

A background worker runs every **30 seconds** inside the Node.js server. It evaluates three automated rules across all active gyms:

1. **Zero Check-ins Alert**:
   - Conditions: Gym is active, current time is within operating hours (`opens_at` to `closes_at`), and 0 check-ins occurred in the past 2 hours.
   - Severity: `warning`.
2. **Capacity Breach Alert**:
   - Conditions: Occupancy exceeds 90% of gym capacity (`(occupancy / capacity) > 0.90`).
   - Severity: `critical`.
   - **Auto-Resolution**: Automatically marks resolved when occupancy drops below 85%.
3. **Revenue Drop Alert**:
   - Conditions: Today's revenue is ≥ 30% below same-day-last-week revenue.
   - Severity: `warning`.
   - **Auto-Resolution**: Automatically marks resolved when today's revenue recovers to within 20% of last week.

*Safety Rule*: Duplicate active anomalies are prevented. Critical anomalies cannot be manually dismissed via API (returns `HTTP 403 Forbidden`); they only auto-resolve when safety conditions clear.

---

## 6. Frontend Operations Dashboard

The frontend is a dark-themed React 18 SPA built with Vite and Tailwind CSS.

### Key UI Modules
* **Header & Summary Bar**: Displays live WebSocket connection status (pulsing indicator), system-wide live occupancy, total revenue, and active anomaly count badge.
* **Simulator Controls (Module 4)**: Play/Pause live stream, set speed (1x, 5x, 10x), or reset live baseline.
* **Gym Selector**: Dropdown to switch between gyms, updating all cards and charts instantly.
* **Module 1 (Live Operations)**:
  - Occupancy KPI Card: Live count + gauge bar with color coding (<60% green, 60-85% yellow, >85% red).
  - Revenue Ticker Card: Live today's revenue in INR.
  - Activity Feed: Scrolling feed of the latest 20 real-time checkin/checkout/payment events.
* **Module 2 (Analytics Engine)**:
  - 7-Day Peak-Hours Heatmap.
  - Revenue by Plan Chart (7d, 30d, 90d selector).
  - Churn Risk Radar Table (High: 45-60d, Critical: 60d+ inactive).
  - New vs Renewal Donut Chart.
  - Cross-Gym 30-Day Revenue Ranking Bar Chart.
* **Module 3 (Anomaly Log & Toast Alerts)**:
  - Active anomaly table with severity badges and manual dismissal for warnings.
  - Real-time toast notifications whenever a new anomaly is detected.

---

## 7. How to Run & Test

### Single-Command Start (Docker)
```bash
docker compose up
```
* **Frontend**: `http://localhost:3002` (or port `3000`)
* **Backend API**: `http://localhost:5000`
* **PostgreSQL**: `localhost:5433` / `localhost:5432`

### Run Backend Unit & Integration Tests
```bash
cd backend
npm test
```
Executes 26 unit and integration tests verifying anomaly thresholds, API status codes, and 403 security rules.

### Run Performance Benchmarks
```bash
POSTGRES_HOST=localhost POSTGRES_PORT=5433 node benchmarks/run_benchmarks.js
```
Runs `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)` against all 6 target SQL queries and saves text reports in `benchmarks/screenshots/`.
