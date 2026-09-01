const pool = require('../pool');

const GYM_SPECS = [
  { name: 'WTF Gyms — Lajpat Nagar', city: 'New Delhi', capacity: 220, opens_at: '05:30', closes_at: '22:30', pct: 0.13, m_pct: 0.50, q_pct: 0.30, a_pct: 0.20, active_pct: 0.88, open_tier: 'med' },
  { name: 'WTF Gyms — Connaught Place', city: 'New Delhi', capacity: 180, opens_at: '06:00', closes_at: '22:00', pct: 0.11, m_pct: 0.40, q_pct: 0.40, a_pct: 0.20, active_pct: 0.85, open_tier: 'med' },
  { name: 'WTF Gyms — Bandra West', city: 'Mumbai', capacity: 300, opens_at: '05:00', closes_at: '23:00', pct: 0.15, m_pct: 0.40, q_pct: 0.40, a_pct: 0.20, active_pct: 0.90, open_tier: 'scenario_b' },
  { name: 'WTF Gyms — Powai', city: 'Mumbai', capacity: 250, opens_at: '05:30', closes_at: '22:30', pct: 0.12, m_pct: 0.40, q_pct: 0.40, a_pct: 0.20, active_pct: 0.87, open_tier: 'large' },
  { name: 'WTF Gyms — Indiranagar', city: 'Bengaluru', capacity: 200, opens_at: '05:30', closes_at: '22:00', pct: 0.11, m_pct: 0.40, q_pct: 0.40, a_pct: 0.20, active_pct: 0.89, open_tier: 'med' },
  { name: 'WTF Gyms — Koramangala', city: 'Bengaluru', capacity: 180, opens_at: '06:00', closes_at: '22:00', pct: 0.10, m_pct: 0.40, q_pct: 0.40, a_pct: 0.20, active_pct: 0.86, open_tier: 'med' },
  { name: 'WTF Gyms — Banjara Hills', city: 'Hyderabad', capacity: 160, opens_at: '06:00', closes_at: '22:00', pct: 0.09, m_pct: 0.50, q_pct: 0.30, a_pct: 0.20, active_pct: 0.84, open_tier: 'med' },
  { name: 'WTF Gyms — Sector 18 Noida', city: 'Noida', capacity: 140, opens_at: '06:00', closes_at: '21:30', pct: 0.08, m_pct: 0.60, q_pct: 0.25, a_pct: 0.15, active_pct: 0.82, open_tier: 'small' },
  { name: 'WTF Gyms — Salt Lake', city: 'Kolkata', capacity: 120, opens_at: '06:00', closes_at: '21:00', pct: 0.06, m_pct: 0.60, q_pct: 0.30, a_pct: 0.10, active_pct: 0.80, open_tier: 'scenario_c' },
  { name: 'WTF Gyms — Velachery', city: 'Chennai', capacity: 110, opens_at: '06:00', closes_at: '21:00', pct: 0.05, m_pct: 0.60, q_pct: 0.30, a_pct: 0.10, active_pct: 0.78, open_tier: 'scenario_a' }
];

const FIRST_NAMES = ['Rahul', 'Priya', 'Ankit', 'Neha', 'Arjun', 'Rohan', 'Sneha', 'Vikram', 'Ananya', 'Karan', 'Pooja', 'Amit', 'Riya', 'Siddharth', 'Aditi', 'Gaurav', 'Divya', 'Manish', 'Kavita', 'Sanjay', 'Meera', 'Deepak', 'Nisha', 'Aakash', 'Swati', 'Rajesh', 'Shweta', 'Tarun', 'Simran', 'Varun'];
const LAST_NAMES = ['Sharma', 'Mehta', 'Verma', 'Gupta', 'Patel', 'Singh', 'Kumar', 'Joshi', 'Shah', 'Nair', 'Rao', 'Reddy', 'Chopra', 'Malhotra', 'Bhasin', 'Deshmukh', 'Kulkarni', 'Banerjee', 'Chatterjee', 'Iyer'];

const PRICING = { monthly: 1499, quarterly: 3999, annual: 11999 };
const DURATION_DAYS = { monthly: 30, quarterly: 90, annual: 365 };

const DOW_MULTIPLIERS = [0.45, 1.00, 0.95, 0.90, 0.95, 0.85, 0.70]; // 0=Sun, 1=Mon, ..., 6=Sat

function getHourlyMultiplier(hour, minute) {
  const timeInHours = hour + minute / 60;
  if (timeInHours < 5.5 || timeInHours >= 22.5) return 0;
  if (timeInHours < 7.0) return 0.6;
  if (timeInHours < 10.0) return 1.0;
  if (timeInHours < 12.0) return 0.4;
  if (timeInHours < 14.0) return 0.3;
  if (timeInHours < 17.0) return 0.2;
  if (timeInHours < 21.0) return 0.9;
  return 0.35;
}

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function batchInsert(client, table, columns, rows, batchSize = 1000) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const valuePlaceholders = [];
    const values = [];

    batch.forEach((row, rowIndex) => {
      const rowPlaceholders = [];
      row.forEach((val) => {
        values.push(val);
        rowPlaceholders.push(`$${values.length}`);
      });
      valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
    });

    const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${valuePlaceholders.join(', ')}`;
    await client.query(query, values);
  }
}

async function seed() {
  const startTime = Date.now();
  console.log('Starting WTF LivePulse Database Seeding...');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check idempotency - clear existing tables
    console.log('Clearing existing data...');
    await client.query('TRUNCATE TABLE anomalies, payments, checkins, members, gyms RESTART IDENTITY CASCADE');

    // 1. Seed Gyms
    console.log('Seeding 10 gyms...');
    const gymRows = [];
    for (const spec of GYM_SPECS) {
      gymRows.push([spec.name, spec.city, `${spec.name}, ${spec.city}`, spec.capacity, 'active', spec.opens_at, spec.closes_at]);
    }
    const gymRes = await client.query(
      `INSERT INTO gyms (name, city, address, capacity, status, opens_at, closes_at)
       VALUES ${gymRows.map((_, i) => `($${i*7+1}, $${i*7+2}, $${i*7+3}, $${i*7+4}, $${i*7+5}, $${i*7+6}, $${i*7+7})`).join(', ')}
       RETURNING id, name, capacity`,
      gymRows.flat()
    );

    const gymMap = {};
    gymRes.rows.forEach((row) => {
      gymMap[row.name] = row;
    });

    // 2. Seed Members & Assign Churn Tiers
    console.log('Seeding 5,000 members...');
    const totalTargetMembers = 5000;
    const now = new Date();
    const members = []; // Array of member objects
    const memberRows = [];

    let highChurnNeeded = 160; // Minimum 150 required
    let criticalChurnNeeded = 90; // Minimum 80 required

    let memberIndex = 0;

    for (const spec of GYM_SPECS) {
      const gym = gymMap[spec.name];
      const count = Math.round(totalTargetMembers * spec.pct);

      for (let i = 0; i < count; i++) {
        memberIndex++;
        const firstName = getRandomElement(FIRST_NAMES);
        const lastName = getRandomElement(LAST_NAMES);
        const name = `${firstName} ${lastName}`;
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${memberIndex}@wtfgyms.in`;
        const phone = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;

        // Plan distribution
        let planType = 'monthly';
        const randPlan = Math.random();
        if (randPlan < spec.m_pct) planType = 'monthly';
        else if (randPlan < spec.m_pct + spec.q_pct) planType = 'quarterly';
        else planType = 'annual';

        // Member type & status
        const isRenewal = Math.random() < 0.35;
        const memberType = isRenewal ? 'renewal' : 'new';
        
        let status = 'active';
        if (Math.random() > spec.active_pct) {
          status = Math.random() < 0.7 ? 'inactive' : 'frozen';
        }

        // Determine joined_at
        const daysJoinedAgo = Math.floor(Math.random() * 85) + 5; // 5 to 90 days ago
        const joinedAt = new Date(now.getTime() - daysJoinedAgo * 24 * 60 * 60 * 1000);

        const planExpiresAt = new Date(joinedAt.getTime() + DURATION_DAYS[planType] * 24 * 60 * 60 * 1000);

        // Assign churn status for active members
        let churnCategory = 'healthy';
        if (status === 'active') {
          if (highChurnNeeded > 0 && Math.random() < 0.15) {
            churnCategory = 'high';
            highChurnNeeded--;
          } else if (criticalChurnNeeded > 0 && Math.random() < 0.10) {
            churnCategory = 'critical';
            criticalChurnNeeded--;
          }
        }

        const id = `00000000-0000-4000-8000-${memberIndex.toString(16).padStart(12, '0')}`;

        members.push({
          id,
          gym_id: gym.id,
          gym_name: spec.name,
          name,
          email,
          phone,
          plan_type: planType,
          member_type: memberType,
          status,
          joined_at: joinedAt,
          plan_expires_at: planExpiresAt,
          churnCategory,
          last_checkin_at: null, // to be updated after checkin generation
        });

        memberRows.push([
          id,
          gym.id,
          name,
          email,
          phone,
          planType,
          memberType,
          status,
          joinedAt.toISOString(),
          planExpiresAt.toISOString(),
          null
        ]);
      }
    }

    await batchInsert(client, 'members', ['id', 'gym_id', 'name', 'email', 'phone', 'plan_type', 'member_type', 'status', 'joined_at', 'plan_expires_at', 'last_checkin_at'], memberRows, 1000);
    console.log(`Seeded ${members.length} members successfully.`);

    // 3. Seed Payments
    console.log('Seeding payment history...');
    const paymentRows = [];

    // Helper for payment insertion
    for (const m of members) {
      // First payment on join
      const amount = PRICING[m.plan_type];
      const paidAt1 = new Date(m.joined_at.getTime() + Math.random() * 5 * 60 * 1000); // within 5 min
      
      // Salt Lake scenario C check: customize payment date for Scenario C
      paymentRows.push([
        m.id,
        m.gym_id,
        amount,
        m.plan_type,
        'new',
        paidAt1.toISOString(),
        'Initial subscription'
      ]);

      if (m.member_type === 'renewal') {
        const durationDays = DURATION_DAYS[m.plan_type];
        const paidAt2 = new Date(m.joined_at.getTime() + durationDays * 24 * 60 * 60 * 1000);
        if (paidAt2 <= now) {
          paymentRows.push([
            m.id,
            m.gym_id,
            amount,
            m.plan_type,
            'renewal',
            paidAt2.toISOString(),
            'Membership renewal'
          ]);
        }
      }
    }

    // SCENARIO C SETUP: Salt Lake (Gym 9)
    // Seed at least 8-10 payments totaling >= 15,000 on the matching weekday 7 days ago.
    // Today's revenue: <= 3,000 (0-2 payments today).
    const saltLakeGym = gymMap['WTF Gyms — Salt Lake'];
    const saltLakeMembers = members.filter(m => m.gym_id === saltLakeGym.id);

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Filter out payments for Salt Lake from today and 7 days ago to precisely control Scenario C
    const filteredPaymentRows = paymentRows.filter(p => {
      const pGymId = p[1];
      const pDate = new Date(p[5]);
      if (pGymId === saltLakeGym.id) {
        const isToday = pDate.toDateString() === now.toDateString();
        const is7DaysAgo = pDate.toDateString() === sevenDaysAgo.toDateString();
        if (isToday || is7DaysAgo) return false;
      }
      return true;
    });

    // Add 10 payments of ₹1,499 on 7 days ago for Salt Lake (Total = ₹14,990 or 11 payments = ₹16,489)
    for (let i = 0; i < 11; i++) {
      const m = saltLakeMembers[i % saltLakeMembers.length];
      const pDate = new Date(sevenDaysAgo.getTime() + (8 + i) * 60 * 60 * 1000); // spread across 7 days ago
      filteredPaymentRows.push([
        m.id,
        m.gym_id,
        1499.00,
        'monthly',
        'renewal',
        pDate.toISOString(),
        'Scenario C - 7 days ago baseline'
      ]);
    }

    // Add 1 payment today of ₹1,499 for Salt Lake (Total today = ₹1,499 <= ₹3,000)
    const slMemberToday = saltLakeMembers[12];
    const todayPaymentDate = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    filteredPaymentRows.push([
      slMemberToday.id,
      slMemberToday.gym_id,
      1499.00,
      'monthly',
      'renewal',
      todayPaymentDate.toISOString(),
      'Scenario C - Today low revenue'
    ]);

    await batchInsert(client, 'payments', ['member_id', 'gym_id', 'amount', 'plan_type', 'payment_type', 'paid_at', 'notes'], filteredPaymentRows, 1000);
    console.log(`Seeded ${filteredPaymentRows.length} payment records.`);

    // 4. Seed Check-ins (90 Days History + Scenario A/B/C setups)
    console.log('Seeding ~270,000 historical check-ins across 90 days...');
    const checkinRows = [];
    const latestMemberCheckin = {}; // member_id -> Date

    // Group members by gym
    const gymMembersMap = {};
    members.forEach(m => {
      if (!gymMembersMap[m.gym_id]) gymMembersMap[m.gym_id] = [];
      gymMembersMap[m.gym_id].push(m);
    });

    const velacheryGym = gymMap['WTF Gyms — Velachery'];
    const bandraGym = gymMap['WTF Gyms — Bandra West'];

    // Generate historical checkins day by day for 90 days (excluding today for normal generation)
    for (let d = 90; d >= 1; d--) {
      const dayDate = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
      const dow = dayDate.getDay();
      const dowMult = DOW_MULTIPLIERS[dow];

      for (const spec of GYM_SPECS) {
        const gym = gymMap[spec.name];
        const gMembers = gymMembersMap[gym.id];
        const activeGMembers = gMembers.filter(m => m.status === 'active');

        // Target daily checkins for this gym based on capacity
        const baseDailyCheckins = Math.round(spec.capacity * 1.5 * dowMult);

        for (let hour = 5; hour <= 22; hour++) {
          const mult = getHourlyMultiplier(hour, 0);
          if (mult <= 0) continue;

          // Number of checkins in this hour slot
          const slotCheckinsCount = Math.floor((baseDailyCheckins / 15) * mult * (0.8 + Math.random() * 0.4));

          for (let c = 0; c < slotCheckinsCount; c++) {
            const member = getRandomElement(activeGMembers);
            if (!member) continue;

            const minute = Math.floor(Math.random() * 60);
            const checkinTime = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), hour, minute);

            // Skip if before member's joined_at
            if (checkinTime < member.joined_at) continue;

            // Session duration 45 to 90 minutes
            const durationMinutes = Math.floor(45 + Math.random() * 45);
            const checkoutTime = new Date(checkinTime.getTime() + durationMinutes * 60 * 1000);

            // Do not generate future checkout times
            if (checkoutTime >= now) continue;

            checkinRows.push([
              member.id,
              gym.id,
              checkinTime.toISOString(),
              checkoutTime.toISOString()
            ]);

            // Update latest checkin for churn tracking if not high/critical churn override
            if (!latestMemberCheckin[member.id] || checkinTime > latestMemberCheckin[member.id]) {
              latestMemberCheckin[member.id] = checkinTime;
            }
          }
        }
      }
    }

    // Now handle Churn-Risk Members explicitly:
    // High Risk: 45 to 60 days ago
    // Critical Risk: 60+ days ago
    for (const m of members) {
      if (m.churnCategory === 'high') {
        const daysAgo = 46 + Math.floor(Math.random() * 12); // 46 to 58 days ago
        const churnCheckinTime = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        const checkoutTime = new Date(churnCheckinTime.getTime() + 60 * 60 * 1000);
        checkinRows.push([m.id, m.gym_id, churnCheckinTime.toISOString(), checkoutTime.toISOString()]);
        latestMemberCheckin[m.id] = churnCheckinTime;
      } else if (m.churnCategory === 'critical') {
        const daysAgo = 62 + Math.floor(Math.random() * 20); // 62 to 82 days ago
        const churnCheckinTime = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        const checkoutTime = new Date(churnCheckinTime.getTime() + 60 * 60 * 1000);
        checkinRows.push([m.id, m.gym_id, churnCheckinTime.toISOString(), checkoutTime.toISOString()]);
        latestMemberCheckin[m.id] = churnCheckinTime;
      }
    }

    // 5. TODAY's Pre-seeded Checkins & ANOMALY SCENARIO SETUPS (Today)
    console.log('Seeding today checkins & anomaly scenarios...');

    for (const spec of GYM_SPECS) {
      const gym = gymMap[spec.name];
      const gMembers = gymMembersMap[gym.id].filter(m => m.status === 'active');

      if (spec.open_tier === 'scenario_a') {
        // SCENARIO A: Velachery Gym
        // 0 open checkins. Most recent checkin row must be >2h 10m ago!
        const velacheryLatestTime = new Date(now.getTime() - 2 * 60 * 60 * 1000 - 15 * 60 * 1000); // 2h 15m ago
        const velacheryCheckoutTime = new Date(velacheryLatestTime.getTime() + 60 * 60 * 1000);
        const member = gMembers[0];
        checkinRows.push([
          member.id,
          gym.id,
          velacheryLatestTime.toISOString(),
          velacheryCheckoutTime.toISOString() // CLOSED, checked_out is NOT NULL
        ]);
        latestMemberCheckin[member.id] = velacheryLatestTime;
      } else if (spec.open_tier === 'scenario_b') {
        // SCENARIO B: Bandra West Gym (Capacity 300)
        // Seed 280 open checkins (checked_out = NULL) within last 90 minutes.
        const countToSeed = 280;
        for (let b = 0; b < countToSeed; b++) {
          const member = gMembers[b % gMembers.length];
          const checkinTime = new Date(now.getTime() - Math.floor(10 + Math.random() * 75) * 60 * 1000);
          checkinRows.push([
            member.id,
            gym.id,
            checkinTime.toISOString(),
            null // OPEN check-in
          ]);
          latestMemberCheckin[member.id] = checkinTime;
        }
      } else {
        // Normal open checkins population for other gyms
        let targetOpenCount = 15;
        if (spec.open_tier === 'large') targetOpenCount = 30;
        else if (spec.open_tier === 'med') targetOpenCount = 20;
        else if (spec.open_tier === 'small') targetOpenCount = 10;

        for (let o = 0; o < targetOpenCount; o++) {
          const member = gMembers[o % gMembers.length];
          const checkinTime = new Date(now.getTime() - Math.floor(15 + Math.random() * 60) * 60 * 1000);
          checkinRows.push([
            member.id,
            gym.id,
            checkinTime.toISOString(),
            null // OPEN check-in
          ]);
          latestMemberCheckin[member.id] = checkinTime;
        }
      }
    }

    console.log(`Inserting total ${checkinRows.length} checkin rows...`);
    await batchInsert(client, 'checkins', ['member_id', 'gym_id', 'checked_in', 'checked_out'], checkinRows, 2000);
    console.log('Checkins insertion completed.');

    // 6. Synchronize members.last_checkin_at
    console.log('Updating members last_checkin_at timestamps...');
    const memberUpdateRows = [];
    for (const m of members) {
      let lastCheckin = latestMemberCheckin[m.id];
      if (!lastCheckin) {
        // Default healthy checkin timestamp if missing
        if (m.churnCategory === 'high') {
          lastCheckin = new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000);
        } else if (m.churnCategory === 'critical') {
          lastCheckin = new Date(now.getTime() - 65 * 24 * 60 * 60 * 1000);
        } else {
          lastCheckin = new Date(now.getTime() - Math.floor(1 + Math.random() * 10) * 24 * 60 * 60 * 1000);
        }
      }
      memberUpdateRows.push([m.id, lastCheckin.toISOString()]);
    }

    // Execute bulk update using temporary table or query
    await client.query(`
      CREATE TEMP TABLE member_checkin_updates (
        id UUID,
        last_checkin_at TIMESTAMPTZ
      ) ON COMMIT DROP;
    `);

    await batchInsert(client, 'member_checkin_updates', ['id', 'last_checkin_at'], memberUpdateRows, 2000);

    await client.query(`
      UPDATE members m
      SET last_checkin_at = u.last_checkin_at
      FROM member_checkin_updates u
      WHERE m.id = u.id;
    `);

    // 7. Refresh Materialized View
    console.log('Refreshing materialized view gym_hourly_stats...');
    await client.query('REFRESH MATERIALIZED VIEW gym_hourly_stats;');

    await client.query('COMMIT');

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Database seeding completed successfully in ${duration} seconds!`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = seed;
