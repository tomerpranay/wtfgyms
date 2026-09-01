const express = require('express');
const router = express.Router();
const gymService = require('../services/gymService');

// GET /api/gyms - List all gym locations with current occupancy and today's revenue
router.get('/', async (req, res, next) => {
  try {
    const gyms = await gymService.getAllGymsWithLiveStats();
    res.json({ success: true, count: gyms.length, data: gyms });
  } catch (err) {
    next(err);
  }
});

// GET /api/gyms/:id/live - Live snapshot for single gym (<5ms)
router.get('/:id/live', async (req, res, next) => {
  try {
    const { id } = req.params;
    const snapshot = await gymService.getGymLiveSnapshot(id);
    if (!snapshot) {
      return res.status(404).json({ success: false, error: 'Gym not found' });
    }
    res.json({ success: true, data: snapshot });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
