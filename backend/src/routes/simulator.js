const express = require('express');
const router = express.Router();
const simulatorService = require('../services/simulatorService');

// POST /api/simulator/start
router.post('/start', (req, res) => {
  const { speed } = req.body || {};
  const parsedSpeed = parseInt(speed || 1, 10);
  if (![1, 5, 10].includes(parsedSpeed)) {
    return res.status(400).json({ success: false, error: 'Speed must be 1, 5, or 10' });
  }

  const result = simulatorService.startSimulation(parsedSpeed);
  res.json({ success: true, data: result });
});

// POST /api/simulator/stop
router.post('/stop', (req, res) => {
  const result = simulatorService.stopSimulation();
  res.json({ success: true, data: result });
});

// POST /api/simulator/reset
router.post('/reset', async (req, res, next) => {
  try {
    const result = await simulatorService.resetSimulation();
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/simulator/status
router.get('/status', (req, res) => {
  const status = simulatorService.getSimulationStatus();
  res.json({ success: true, data: status });
});

module.exports = router;
