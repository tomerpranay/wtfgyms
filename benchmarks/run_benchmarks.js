const fs = require('fs');
const path = require('path');
const pool = require('../backend/src/db/pool');
const runMigrations = require('../backend/src/db/migrations/runMigrations');
const seed = require('../backend/src/db/seeds/seed');

async function runBenchmarks() {
  console.log('=== WTF LivePulse Database Benchmark Suite ===');

  // Ensure DB ready and seeded
  await runMigrations();
  const checkGyms = await pool.query('SELECT COUNT(*)::INTEGER AS count FROM gyms');
  if (checkGyms.rows[0].count === 0) {
    console.log('Database empty, seeding dataset for benchmarks...');
    await seed();
  }

  // Get a sample gym_id
  const gymRes = await pool.query('SELECT id, name FROM gyms LIMIT 1');
  const gymId = gymRes.rows[0].id;
  const gymName = gymRes.rows[0].name;

  const queries = [
    {
      id: 'Q1',
      name: 'Live Occupancy — Single Gym',
      target: '< 0.5ms',
      requiredIndex: 'idx_checkins_live_occupancy (partial)',
      sql: 'EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT COUNT(*) FROM checkins WHERE gym_id = $1 AND checked_out IS NULL',
      params: [gymId]
    },
    {
      id: 'Q2',
      name: "Today's Revenue — Single Gym",
      target: '< 0.8ms',
      requiredIndex: 'idx_payments_gym_date (composite)',
      sql: 'EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT SUM(amount) FROM payments WHERE gym_id = $1 AND paid_at >= CURRENT_DATE',
      params: [gymId]
    },
    {
      id: 'Q3',
      name: 'Churn Risk Members',
      target: '< 1.0ms',
      requiredIndex: 'idx_members_churn_risk (partial)',
      sql: "EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT id, name, last_checkin_at FROM members WHERE status='active' AND last_checkin_at < NOW() - INTERVAL '45 days'",
      params: []
    },
    {
      id: 'Q4',
      name: 'Peak Hour Heatmap (7d)',
      target: '< 0.3ms',
      requiredIndex: 'Materialized view unique index',
      sql: 'EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT * FROM gym_hourly_stats WHERE gym_id = $1',
      params: [gymId]
    },
    {
      id: 'Q5',
      name: 'Cross-Gym Revenue Comparison',
      target: '< 2.0ms',
      requiredIndex: 'idx_payments_date (covering)',
      sql: "EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT gym_id, SUM(amount) FROM payments WHERE paid_at >= NOW() - INTERVAL '30 days' GROUP BY gym_id ORDER BY SUM DESC",
      params: []
    },
    {
      id: 'Q6',
      name: 'Active Anomalies — All Gyms',
      target: '< 0.3ms',
      requiredIndex: 'idx_anomalies_active (partial)',
      sql: 'EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT * FROM anomalies WHERE resolved = FALSE ORDER BY detected_at DESC',
      params: []
    }
  ];

  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const results = [];

  for (const q of queries) {
    console.log(`\nExecuting Benchmark for ${q.id}: ${q.name}...`);
    const res = await pool.query(q.sql, q.params);
    const explainPlan = res.rows.map(r => r['QUERY PLAN']).join('\n');

    // Extract execution time from plan
    const execTimeMatch = explainPlan.match(/Execution Time:\s*([0-9.]+)\s*ms/i);
    const measuredTime = execTimeMatch ? `${execTimeMatch[1]} ms` : 'N/A';

    // Verify sequential scan absence
    const hasSeqScan = /Seq Scan on checkins|Seq Scan on payments/i.test(explainPlan);
    const indexUsedMatch = explainPlan.match(/Index Scan|Index Only Scan|Bitmap Index Scan/i);
    const scanStatus = hasSeqScan ? '❌ SEQ SCAN DETECTED' : '✅ INDEX USED';

    console.log(`Measured Time: ${measuredTime} (Target: ${q.target}) | Status: ${scanStatus}`);

    // Write EXPLAIN ANALYZE screenshot text artifact
    const artifactPath = path.join(screenshotsDir, `${q.id.toLowerCase()}_explain_analyze.txt`);
    const reportContent = `=== BENCHMARK ${q.id}: ${q.name} ===\nTarget: ${q.target}\nMeasured Execution Time: ${measuredTime}\nIndex Status: ${scanStatus}\nRequired Index: ${q.requiredIndex}\n\nEXPLAIN ANALYZE OUTPUT:\n${explainPlan}\n`;
    fs.writeFileSync(artifactPath, reportContent, 'utf8');

    results.push({
      id: q.id,
      name: q.name,
      target: q.target,
      measured: measuredTime,
      requiredIndex: q.requiredIndex,
      status: scanStatus
    });
  }

  console.log('\n=================== BENCHMARK SUMMARY TABLE ===================');
  console.table(results);

  await pool.end();
  return results;
}

if (require.main === module) {
  runBenchmarks()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = runBenchmarks;
