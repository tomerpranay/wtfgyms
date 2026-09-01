const pool = require('../db/pool');

let simulationState = {
  status: 'paused', // 'running' | 'paused'
  speed: 1, // 1 | 5 | 10
  intervalId: null
};

let wsBroadcast = null;

function setBroadcastHandler(broadcastFn) {
  wsBroadcast = broadcastFn;
}

function getSimulationStatus() {
  return {
    status: simulationState.status,
    speed: simulationState.speed
  };
}

async function triggerSimulationStep() {
  try {
    const gymsRes = await pool.query('SELECT id, name, capacity FROM gyms WHERE status = $1', ['active']);
    if (gymsRes.rows.length === 0) return;

    const gym = gymsRes.rows[Math.floor(Math.random() * gymsRes.rows.length)];
    const actionType = Math.random() < 0.45 ? 'checkin' : (Math.random() < 0.85 ? 'checkout' : 'payment');

    if (actionType === 'checkin') {
      const memberRes = await pool.query(
        'SELECT id, name FROM members WHERE gym_id = $1 AND status = $2 ORDER BY RANDOM() LIMIT 1',
        [gym.id, 'active']
      );
      if (memberRes.rows.length > 0) {
        const member = memberRes.rows[0];
        const now = new Date();
        
        await pool.query(
          'INSERT INTO checkins (member_id, gym_id, checked_in, checked_out) VALUES ($1, $2, $3, NULL)',
          [member.id, gym.id, now.toISOString()]
        );

        await pool.query(
          'UPDATE members SET last_checkin_at = $1 WHERE id = $2',
          [now.toISOString(), member.id]
        );

        const occRes = await pool.query(
          'SELECT COUNT(*)::INTEGER AS occupancy FROM checkins WHERE gym_id = $1 AND checked_out IS NULL',
          [gym.id]
        );
        const occupancy = parseInt(occRes.rows[0].occupancy, 10);
        const capacityPct = Math.round((occupancy / gym.capacity) * 100);

        const eventPayload = {
          type: 'CHECKIN_EVENT',
          gym_id: gym.id,
          gym_name: gym.name,
          member_name: member.name,
          timestamp: now.toISOString(),
          current_occupancy: occupancy,
          capacity_pct: capacityPct
        };

        if (wsBroadcast) wsBroadcast(eventPayload);
      }
    } else if (actionType === 'checkout') {
      const openCheckinRes = await pool.query(
        `SELECT c.id, m.name AS member_name 
         FROM checkins c
         JOIN members m ON c.member_id = m.id
         WHERE c.gym_id = $1 AND c.checked_out IS NULL
         ORDER BY c.checked_in ASC LIMIT 1`,
        [gym.id]
      );

      if (openCheckinRes.rows.length > 0) {
        const openCheckin = openCheckinRes.rows[0];
        const now = new Date();

        await pool.query(
          'UPDATE checkins SET checked_out = $1 WHERE id = $2',
          [now.toISOString(), openCheckin.id]
        );

        const occRes = await pool.query(
          'SELECT COUNT(*)::INTEGER AS occupancy FROM checkins WHERE gym_id = $1 AND checked_out IS NULL',
          [gym.id]
        );
        const occupancy = parseInt(occRes.rows[0].occupancy, 10);
        const capacityPct = Math.round((occupancy / gym.capacity) * 100);

        const eventPayload = {
          type: 'CHECKOUT_EVENT',
          gym_id: gym.id,
          gym_name: gym.name,
          member_name: openCheckin.member_name,
          timestamp: now.toISOString(),
          current_occupancy: occupancy,
          capacity_pct: capacityPct
        };

        if (wsBroadcast) wsBroadcast(eventPayload);
      }
    } else if (actionType === 'payment') {
      const memberRes = await pool.query(
        'SELECT id, name, plan_type FROM members WHERE gym_id = $1 ORDER BY RANDOM() LIMIT 1',
        [gym.id]
      );

      if (memberRes.rows.length > 0) {
        const member = memberRes.rows[0];
        const amounts = { monthly: 1499, quarterly: 3999, annual: 11999 };
        const amount = amounts[member.plan_type] || 1499;
        const now = new Date();

        await pool.query(
          'INSERT INTO payments (member_id, gym_id, amount, plan_type, payment_type, paid_at, notes) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [member.id, gym.id, amount, member.plan_type, 'renewal', now.toISOString(), 'Simulated renewal payment']
        );

        const revRes = await pool.query(
          'SELECT COALESCE(SUM(amount), 0)::NUMERIC AS today_total FROM payments WHERE gym_id = $1 AND paid_at >= CURRENT_DATE',
          [gym.id]
        );
        const todayTotal = parseFloat(revRes.rows[0].today_total);

        const eventPayload = {
          type: 'PAYMENT_EVENT',
          gym_id: gym.id,
          gym_name: gym.name,
          amount,
          plan_type: member.plan_type,
          member_name: member.name,
          today_total: todayTotal,
          timestamp: now.toISOString()
        };

        if (wsBroadcast) wsBroadcast(eventPayload);
      }
    }
  } catch (err) {
    console.error('Error during simulation step:', err);
  }
}

function startSimulation(speed = 1) {
  stopSimulation();
  simulationState.status = 'running';
  simulationState.speed = speed;

  const intervalMs = Math.max(200, Math.floor(2000 / speed));
  simulationState.intervalId = setInterval(triggerSimulationStep, intervalMs);

  return getSimulationStatus();
}

function stopSimulation() {
  if (simulationState.intervalId) {
    clearInterval(simulationState.intervalId);
    simulationState.intervalId = null;
  }
  simulationState.status = 'paused';
  return getSimulationStatus();
}

async function resetSimulation() {
  stopSimulation();
  // Clear open check-ins created today during simulation, keeping baseline
  await pool.query("UPDATE checkins SET checked_out = NOW() WHERE checked_out IS NULL AND checked_in > NOW() - INTERVAL '3 hours'");
  return { status: 'reset' };
}

module.exports = {
  setBroadcastHandler,
  getSimulationStatus,
  triggerSimulationStep,
  startSimulation,
  stopSimulation,
  resetSimulation
};
