const express = require('express');
const router = express.Router();
const statsService = require('../services/statsService');

// GET /api/analytics/cross-gym - Cross-gym revenue ranking (<2ms)
router.get('/cross-gym', async (req, res, next) => {
  try {
    const data = await statsService.getCrossGymRevenue();
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
});

// GET /api/gyms/:id/analytics - Peak hour heatmap, plan breakdown, churn risk members, member ratio
router.get('/gyms/:id/analytics', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { dateRange } = req.query;
    const analytics = await statsService.getGymAnalytics(id, dateRange);
    res.json({ success: true, data: analytics });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
