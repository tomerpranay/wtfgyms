const request = require('supertest');
const { app } = require('../../src/app');
const pool = require('../../src/db/pool');
const runMigrations = require('../../src/db/migrations/runMigrations');
const seed = require('../../src/db/seeds/seed');

describe('WTF LivePulse Backend REST API (Integration Tests)', () => {

  beforeAll(async () => {
    await runMigrations();
    await seed();
  }, 120000);

  afterAll(async () => {
    await pool.end();
  });

  // 1. GET /api/gyms
  test('GET /api/gyms returns 200 OK with exactly 10 gym locations', async () => {
    const res = await request(app).get('/api/gyms');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(10);

    const firstGym = res.body.data[0];
    expect(firstGym).toHaveProperty('id');
    expect(firstGym).toHaveProperty('name');
    expect(firstGym).toHaveProperty('capacity');
    expect(firstGym).toHaveProperty('current_occupancy');
    expect(firstGym).toHaveProperty('today_revenue');
  });

  // 2. GET /api/gyms/:id/live
  test('GET /api/gyms/:id/live returns single gym live snapshot', async () => {
    const gymsRes = await request(app).get('/api/gyms');
    const gymId = gymsRes.body.data[0].id;

    const res = await request(app).get(`/api/gyms/${gymId}/live`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('gym');
    expect(res.body.data).toHaveProperty('current_occupancy');
    expect(res.body.data).toHaveProperty('today_revenue');
    expect(res.body.data).toHaveProperty('recent_events');
  });

  test('GET /api/gyms/:id/live returns 404 for invalid UUID', async () => {
    const res = await request(app).get('/api/gyms/00000000-0000-0000-0000-000000000000/live');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // 3. GET /api/gyms/:id/analytics
  test('GET /api/gyms/:id/analytics returns peak hours heatmap and plan revenue', async () => {
    const gymsRes = await request(app).get('/api/gyms');
    const gymId = gymsRes.body.data[0].id;

    const res = await request(app).get(`/api/gyms/${gymId}/analytics?dateRange=30d`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('peak_hours_heatmap');
    expect(res.body.data).toHaveProperty('revenue_by_plan');
    expect(res.body.data).toHaveProperty('churn_risk_members');
  });

  // 4. GET /api/analytics/cross-gym
  test('GET /api/analytics/cross-gym returns 30-day cross-gym ranking', async () => {
    const res = await request(app).get('/api/analytics/cross-gym');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(10);
    expect(res.body.data[0]).toHaveProperty('rank');
    expect(res.body.data[0]).toHaveProperty('total_revenue');
  });

  // 5. GET /api/anomalies & PATCH /api/anomalies/:id/dismiss (403 on critical)
  test('GET /api/anomalies returns active anomalies list', async () => {
    const res = await request(app).get('/api/anomalies');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('PATCH /api/anomalies/:id/dismiss returns 403 when anomaly is CRITICAL', async () => {
    // Insert a test critical anomaly directly
    const insertRes = await pool.query(`
      INSERT INTO anomalies (gym_id, type, severity, message, resolved, dismissed)
      SELECT id, 'capacity_breach', 'critical', 'Test critical breach', FALSE, FALSE
      FROM gyms LIMIT 1 RETURNING id
    `);
    const criticalId = insertRes.rows[0].id;

    const res = await request(app).patch(`/api/anomalies/${criticalId}/dismiss`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Critical anomalies cannot be manually dismissed');
  });

  test('PATCH /api/anomalies/:id/dismiss succeeds for WARNING anomaly', async () => {
    // Insert a test warning anomaly directly
    const insertRes = await pool.query(`
      INSERT INTO anomalies (gym_id, type, severity, message, resolved, dismissed)
      SELECT id, 'zero_checkins', 'warning', 'Test warning zero checkins', FALSE, FALSE
      FROM gyms LIMIT 1 RETURNING id
    `);
    const warningId = insertRes.rows[0].id;

    const res = await request(app).patch(`/api/anomalies/${warningId}/dismiss`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.dismissed).toBe(true);
  });

  test('PATCH /api/anomalies/:id/dismiss returns 404 for non-existent anomaly', async () => {
    const res = await request(app).patch('/api/anomalies/00000000-0000-0000-0000-000000000000/dismiss');
    expect(res.status).toBe(404);
  });

  // 6. POST /api/simulator/start | stop | reset
  test('POST /api/simulator/start starts simulation at speed 5x', async () => {
    const res = await request(app).post('/api/simulator/start').send({ speed: 5 });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('running');
    expect(res.body.data.speed).toBe(5);
  });

  test('POST /api/simulator/start returns 400 on invalid speed', async () => {
    const res = await request(app).post('/api/simulator/start').send({ speed: 99 });
    expect(res.status).toBe(400);
  });

  test('POST /api/simulator/stop pauses simulation', async () => {
    const res = await request(app).post('/api/simulator/stop');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('paused');
  });

  test('POST /api/simulator/reset resets simulation', async () => {
    const res = await request(app).post('/api/simulator/reset');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('reset');
  });

});
