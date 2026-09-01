const pool = require('../db/pool');

async function getActiveAnomalies(gymId = null, severity = null) {
  let query = `
    SELECT a.*, g.name AS gym_name, g.city
    FROM anomalies a
    JOIN gyms g ON a.gym_id = g.id
    WHERE a.resolved = FALSE
  `;
  const params = [];

  if (gymId) {
    params.push(gymId);
    query += ` AND a.gym_id = $${params.length}`;
  }

  if (severity) {
    params.push(severity);
    query += ` AND a.severity = $${params.length}`;
  }

  query += ` ORDER BY a.detected_at DESC`;

  const res = await pool.query(query, params);
  return res.rows;
}

async function dismissAnomaly(anomalyId) {
  const checkRes = await pool.query('SELECT * FROM anomalies WHERE id = $1', [anomalyId]);
  if (checkRes.rows.length === 0) {
    const error = new Error('Anomaly not found');
    error.status = 404;
    throw error;
  }

  const anomaly = checkRes.rows[0];
  if (anomaly.severity === 'critical') {
    const error = new Error('Critical anomalies cannot be manually dismissed');
    error.status = 403;
    throw error;
  }

  const updateRes = await pool.query(
    'UPDATE anomalies SET dismissed = TRUE WHERE id = $1 RETURNING *',
    [anomalyId]
  );
  return updateRes.rows[0];
}

module.exports = {
  getActiveAnomalies,
  dismissAnomaly
};
