const express = require('express');
const router = express.Router();
const anomalyService = require('../services/anomalyService');

// GET /api/anomalies - List all active (unresolved) anomalies
router.get('/', async (req, res, next) => {
  try {
    const { gym_id, severity } = req.query;
    const anomalies = await anomalyService.getActiveAnomalies(gym_id, severity);
    res.json({ success: true, count: anomalies.length, data: anomalies });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/anomalies/:id/dismiss - Dismiss warning-level anomaly (403 if critical)
router.patch('/:id/dismiss', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await anomalyService.dismissAnomaly(id);
    res.json({ success: true, data: updated });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, error: err.message });
    }
    next(err);
  }
});

module.exports = router;
