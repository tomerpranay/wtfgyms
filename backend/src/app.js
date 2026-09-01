const http = require('http');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./db/pool');
const runMigrations = require('./db/migrations/runMigrations');
const seed = require('./db/seeds/seed');

const { initWebSocketServer, broadcast } = require('./websocket/websocketServer');
const { setBroadcastHandler } = require('./services/simulatorService');
const { setAnomalyBroadcastHandler, startAnomalyDetector } = require('./jobs/anomalyDetector');

const gymsRouter = require('./routes/gyms');
const analyticsRouter = require('./routes/analytics');
const anomaliesRouter = require('./routes/anomalies');
const simulatorRouter = require('./routes/simulator');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Attach routes
app.use('/api/gyms', gymsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api', analyticsRouter); // Also mounts GET /api/gyms/:id/analytics
app.use('/api/anomalies', anomaliesRouter);
app.use('/api/simulator', simulatorRouter);

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
  }
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled API Error:', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Initialize WebSocket server
initWebSocketServer(server);
setBroadcastHandler(broadcast);
setAnomalyBroadcastHandler(broadcast);

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    console.log('Connecting to PostgreSQL database...');
    // Run schema migrations
    await runMigrations();

    // Check if seeding is required
    const checkGyms = await pool.query('SELECT COUNT(*)::INTEGER AS count FROM gyms');
    if (checkGyms.rows[0].count === 0) {
      console.log('Database is empty. Executing initial database seed...');
      await seed();
    } else {
      console.log(`Database already seeded with ${checkGyms.rows[0].count} gyms.`);
    }

    // Start background anomaly detector
    startAnomalyDetector(30000);

    server.listen(PORT, () => {
      console.log(`🚀 WTF LivePulse Backend Server running on port ${PORT}`);
      console.log(`📡 WebSocket Endpoint available at ws://localhost:${PORT}/ws`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, server };
