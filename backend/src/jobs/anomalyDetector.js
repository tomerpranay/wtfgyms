const pool = require('../db/pool');

let wsBroadcast = null;

function setAnomalyBroadcastHandler(broadcastFn) {
  wsBroadcast = broadcastFn;
}

async function runAnomalyDetector() {
  try {
    const gymsRes = await pool.query('SELECT id, name, capacity, status, opens_at, closes_at FROM gyms WHERE status = $1', ['active']);
    const gyms = gymsRes.rows;

    const now = new Date();
    const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`;

    for (const gym of gyms) {
      // 1. Check Capacity Breach Anomaly
      const occRes = await pool.query(
        'SELECT COUNT(*)::INTEGER AS occupancy FROM checkins WHERE gym_id = $1 AND checked_out IS NULL',
        [gym.id]
      );
      const occupancy = parseInt(occRes.rows[0].occupancy, 10);
      const capacityPct = (occupancy / gym.capacity);

      const activeCapacityRes = await pool.query(
        'SELECT * FROM anomalies WHERE gym_id = $1 AND type = $2 AND resolved = FALSE',
        [gym.id, 'capacity_breach']
      );
      const activeCapacityAnomaly = activeCapacityRes.rows[0];

      if (capacityPct > 0.90) {
        if (!activeCapacityAnomaly) {
          const msg = `Capacity breach at ${gym.name}: current occupancy ${occupancy}/${gym.capacity} (${Math.round(capacityPct * 100)}%) exceeds 90% threshold`;
          const insertRes = await pool.query(
            `INSERT INTO anomalies (gym_id, type, severity, message, resolved, dismissed, detected_at)
             VALUES ($1, $2, $3, $4, FALSE, FALSE, NOW()) RETURNING *`,
            [gym.id, 'capacity_breach', 'critical', msg]
          );
          const newAnomaly = insertRes.rows[0];

          if (wsBroadcast) {
            wsBroadcast({
              type: 'ANOMALY_DETECTED',
              anomaly_id: newAnomaly.id,
              gym_id: gym.id,
              gym_name: gym.name,
              anomaly_type: 'capacity_breach',
              severity: 'critical',
              message: msg,
              detected_at: newAnomaly.detected_at
            });
          }
        }
      } else if (capacityPct < 0.85 && activeCapacityAnomaly) {
        // Auto-resolve condition
        await pool.query(
          'UPDATE anomalies SET resolved = TRUE, resolved_at = NOW() WHERE id = $1',
          [activeCapacityAnomaly.id]
        );

        if (wsBroadcast) {
          wsBroadcast({
            type: 'ANOMALY_RESOLVED',
            anomaly_id: activeCapacityAnomaly.id,
            gym_id: gym.id,
            gym_name: gym.name,
            resolved_at: new Date().toISOString()
          });
        }
      }

      // 2. Check Zero Check-ins Anomaly
      // Gym must be active and current time within opens_at and closes_at
      const isOpen = currentTimeStr >= gym.opens_at && currentTimeStr <= gym.closes_at;
      if (isOpen) {
        const recentCheckinsRes = await pool.query(
          "SELECT COUNT(*)::INTEGER AS count FROM checkins WHERE gym_id = $1 AND checked_in > NOW() - INTERVAL '2 hours'",
          [gym.id]
        );
        const recentCount = parseInt(recentCheckinsRes.rows[0].count, 10);

        const activeZeroRes = await pool.query(
          'SELECT * FROM anomalies WHERE gym_id = $1 AND type = $2 AND resolved = FALSE',
          [gym.id, 'zero_checkins']
        );
        const activeZeroAnomaly = activeZeroRes.rows[0];

        if (recentCount === 0 && occupancy === 0) {
          if (!activeZeroAnomaly) {
            const msg = `Zero check-ins detected at ${gym.name} during operating hours (${gym.opens_at}-${gym.closes_at}) in the last 2 hours`;
            const insertRes = await pool.query(
              `INSERT INTO anomalies (gym_id, type, severity, message, resolved, dismissed, detected_at)
               VALUES ($1, $2, $3, $4, FALSE, FALSE, NOW()) RETURNING *`,
              [gym.id, 'zero_checkins', 'warning', msg]
            );
            const newAnomaly = insertRes.rows[0];

            if (wsBroadcast) {
              wsBroadcast({
                type: 'ANOMALY_DETECTED',
                anomaly_id: newAnomaly.id,
                gym_id: gym.id,
                gym_name: gym.name,
                anomaly_type: 'zero_checkins',
                severity: 'warning',
                message: msg,
                detected_at: newAnomaly.detected_at
              });
            }
          }
        } else if (recentCount > 0 && activeZeroAnomaly) {
          // Auto-resolve when checkins resume
          await pool.query(
            'UPDATE anomalies SET resolved = TRUE, resolved_at = NOW() WHERE id = $1',
            [activeZeroAnomaly.id]
          );

          if (wsBroadcast) {
            wsBroadcast({
              type: 'ANOMALY_RESOLVED',
              anomaly_id: activeZeroAnomaly.id,
              gym_id: gym.id,
              gym_name: gym.name,
              resolved_at: new Date().toISOString()
            });
          }
        }
      }

      // 3. Check Revenue Drop Anomaly
      const todayRevRes = await pool.query(
        'SELECT COALESCE(SUM(amount), 0)::NUMERIC AS today_revenue FROM payments WHERE gym_id = $1 AND paid_at >= CURRENT_DATE',
        [gym.id]
      );
      const todayRevenue = parseFloat(todayRevRes.rows[0].today_revenue);

      const lastWeekRevRes = await pool.query(
        "SELECT COALESCE(SUM(amount), 0)::NUMERIC AS last_week_revenue FROM payments WHERE gym_id = $1 AND paid_at >= (CURRENT_DATE - INTERVAL '7 days') AND paid_at < (CURRENT_DATE - INTERVAL '6 days')",
        [gym.id]
      );
      const lastWeekRevenue = parseFloat(lastWeekRevRes.rows[0].last_week_revenue);

      const activeRevRes = await pool.query(
        'SELECT * FROM anomalies WHERE gym_id = $1 AND type = $2 AND resolved = FALSE',
        [gym.id, 'revenue_drop']
      );
      const activeRevAnomaly = activeRevRes.rows[0];

      if (lastWeekRevenue >= 10000) { // Require meaningful baseline revenue
        const dropRatio = (lastWeekRevenue - todayRevenue) / lastWeekRevenue;

        if (dropRatio >= 0.30) {
          if (!activeRevAnomaly) {
            const dropPct = Math.round(dropRatio * 100);
            const msg = `Revenue drop detected at ${gym.name}: today's revenue (₹${todayRevenue}) is ${dropPct}% below same day last week (₹${lastWeekRevenue})`;
            const insertRes = await pool.query(
              `INSERT INTO anomalies (gym_id, type, severity, message, resolved, dismissed, detected_at)
               VALUES ($1, $2, $3, $4, FALSE, FALSE, NOW()) RETURNING *`,
              [gym.id, 'revenue_drop', 'warning', msg]
            );
            const newAnomaly = insertRes.rows[0];

            if (wsBroadcast) {
              wsBroadcast({
                type: 'ANOMALY_DETECTED',
                anomaly_id: newAnomaly.id,
                gym_id: gym.id,
                gym_name: gym.name,
                anomaly_type: 'revenue_drop',
                severity: 'warning',
                message: msg,
                detected_at: newAnomaly.detected_at
              });
            }
          }
        } else if (todayRevenue >= 0.80 * lastWeekRevenue && activeRevAnomaly) {
          // Auto-resolve when revenue recovers to within 20%
          await pool.query(
            'UPDATE anomalies SET resolved = TRUE, resolved_at = NOW() WHERE id = $1',
            [activeRevAnomaly.id]
          );

          if (wsBroadcast) {
            wsBroadcast({
              type: 'ANOMALY_RESOLVED',
              anomaly_id: activeRevAnomaly.id,
              gym_id: gym.id,
              gym_name: gym.name,
              resolved_at: new Date().toISOString()
            });
          }
        }
      }
    }
  } catch (err) {
    console.error('Error during background anomaly detection cycle:', err);
  }
}

let intervalId = null;

function startAnomalyDetector(intervalMs = 30000) {
  if (intervalId) clearInterval(intervalId);
  // Run immediately once, then on interval
  runAnomalyDetector();
  intervalId = setInterval(runAnomalyDetector, intervalMs);
}

function stopAnomalyDetector() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

module.exports = {
  setAnomalyBroadcastHandler,
  runAnomalyDetector,
  startAnomalyDetector,
  stopAnomalyDetector
};
