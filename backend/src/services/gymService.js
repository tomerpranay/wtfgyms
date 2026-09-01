const pool = require('../db/pool');

async function getAllGymsWithLiveStats() {
  const query = `
    SELECT 
      g.id,
      g.name,
      g.city,
      g.capacity,
      g.status,
      g.opens_at,
      g.closes_at,
      COALESCE(c.current_occupancy, 0)::INTEGER AS current_occupancy,
      COALESCE(p.today_revenue, 0)::NUMERIC AS today_revenue
    FROM gyms g
    LEFT JOIN (
      SELECT gym_id, COUNT(*) AS current_occupancy
      FROM checkins
      WHERE checked_out IS NULL
      GROUP BY gym_id
    ) c ON g.id = c.gym_id
    LEFT JOIN (
      SELECT gym_id, SUM(amount) AS today_revenue
      FROM payments
      WHERE paid_at >= CURRENT_DATE
      GROUP BY gym_id
    ) p ON g.id = p.gym_id
    ORDER BY g.name ASC;
  `;
  const res = await pool.query(query);
  return res.rows;
}

async function getGymLiveSnapshot(gymId) {
  // Must complete fast (<5ms)
  const gymRes = await pool.query('SELECT * FROM gyms WHERE id = $1', [gymId]);
  if (gymRes.rows.length === 0) return null;
  const gym = gymRes.rows[0];

  const occRes = await pool.query(
    'SELECT COUNT(*)::INTEGER AS occupancy FROM checkins WHERE gym_id = $1 AND checked_out IS NULL',
    [gymId]
  );
  const occupancy = parseInt(occRes.rows[0].occupancy, 10);

  const revRes = await pool.query(
    'SELECT COALESCE(SUM(amount), 0)::NUMERIC AS today_revenue FROM payments WHERE gym_id = $1 AND paid_at >= CURRENT_DATE',
    [gymId]
  );
  const todayRevenue = parseFloat(revRes.rows[0].today_revenue);

  const recentEventsRes = await pool.query(`
    SELECT 'checkin' AS type, c.checked_in AS timestamp, m.name AS member_name, c.gym_id
    FROM checkins c
    JOIN members m ON c.member_id = m.id
    WHERE c.gym_id = $1
    ORDER BY c.checked_in DESC
    LIMIT 10
  `, [gymId]);

  const activeAnomaliesRes = await pool.query(
    'SELECT * FROM anomalies WHERE gym_id = $1 AND resolved = FALSE ORDER BY detected_at DESC',
    [gymId]
  );

  return {
    gym,
    current_occupancy: occupancy,
    capacity_pct: Math.round((occupancy / gym.capacity) * 100),
    today_revenue: todayRevenue,
    recent_events: recentEventsRes.rows,
    active_anomalies: activeAnomaliesRes.rows
  };
}

module.exports = {
  getAllGymsWithLiveStats,
  getGymLiveSnapshot
};
