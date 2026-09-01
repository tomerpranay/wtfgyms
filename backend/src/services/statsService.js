const pool = require('../db/pool');

async function getGymAnalytics(gymId, dateRange = '30d') {
  let days = 30;
  if (dateRange === '7d') days = 7;
  if (dateRange === '90d') days = 90;

  // 1. Peak Hour Heatmap (from Materialized View)
  const heatmapRes = await pool.query(
    'SELECT day_of_week, hour_of_day, checkin_count::INTEGER FROM gym_hourly_stats WHERE gym_id = $1 ORDER BY day_of_week, hour_of_day',
    [gymId]
  );

  // 2. Revenue by Plan Type
  const revenuePlanRes = await pool.query(
    `SELECT plan_type, COALESCE(SUM(amount), 0)::NUMERIC AS total_revenue, COUNT(*)::INTEGER AS payment_count
     FROM payments
     WHERE gym_id = $1 AND paid_at >= NOW() - ($2 || ' days')::INTERVAL
     GROUP BY plan_type`,
    [gymId, days]
  );

  // 3. Churn Risk Members (High: 45-60d, Critical: >60d)
  const churnRes = await pool.query(
    `SELECT id, name, email, plan_type, last_checkin_at,
       ROUND(EXTRACT(EPOCH FROM (NOW() - last_checkin_at))/86400)::INTEGER AS days_since_last_checkin,
       CASE 
         WHEN last_checkin_at < NOW() - INTERVAL '60 days' THEN 'CRITICAL'
         WHEN last_checkin_at < NOW() - INTERVAL '45 days' THEN 'HIGH'
         ELSE 'HEALTHY'
       END AS risk_level
     FROM members
     WHERE gym_id = $1 AND status = 'active' AND last_checkin_at < NOW() - INTERVAL '45 days'
     ORDER BY last_checkin_at ASC`,
    [gymId]
  );

  // 4. New vs Renewal ratio
  const ratioRes = await pool.query(
    `SELECT member_type, COUNT(*)::INTEGER AS count
     FROM members
     WHERE gym_id = $1
     GROUP BY member_type`,
    [gymId]
  );

  return {
    gym_id: gymId,
    date_range: dateRange,
    peak_hours_heatmap: heatmapRes.rows,
    revenue_by_plan: revenuePlanRes.rows,
    churn_risk_members: churnRes.rows,
    member_ratio: ratioRes.rows
  };
}

async function getCrossGymRevenue() {
  const query = `
    SELECT 
      g.id AS gym_id,
      g.name AS gym_name,
      g.city,
      COALESCE(SUM(p.amount), 0)::NUMERIC AS total_revenue,
      DENSE_RANK() OVER (ORDER BY COALESCE(SUM(p.amount), 0) DESC)::INTEGER AS rank
    FROM gyms g
    LEFT JOIN payments p ON g.id = p.gym_id AND p.paid_at >= NOW() - INTERVAL '30 days'
    GROUP BY g.id, g.name, g.city
    ORDER BY total_revenue DESC;
  `;
  const res = await pool.query(query);
  return res.rows;
}

module.exports = {
  getGymAnalytics,
  getCrossGymRevenue
};
