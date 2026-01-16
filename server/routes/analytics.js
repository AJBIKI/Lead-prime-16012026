const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analytics');
const { requireAuth } = require('../middleware/auth');
const logger = require('../logger');

// Get Dashboard Overview
router.get('/overview', requireAuth, async (req, res) => {
    try {
        const stats = await analyticsService.getOverviewStats(req.userId);
        res.json(stats);
    } catch (err) {
        logger.error(`Analytics API Error: ${err.message}`);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// Get Leads Time Series
router.get('/trends', requireAuth, async (req, res) => {
    try {
        const trends = await analyticsService.getLeadsTimeSeries(req.userId);
        res.json({ trends });
    } catch (err) {
        logger.error(`Analytics Trends Error: ${err.message}`);
        res.status(500).json({ error: 'Failed to fetch trends' });
    }
});

// Get Cost Estimates
router.get('/costs', requireAuth, async (req, res) => {
    try {
        const costs = await analyticsService.getCostEstimation(req.userId);
        res.json(costs);
    } catch (err) {
        logger.error(`Analytics Costs Error: ${err.message}`);
        res.status(500).json({ error: 'Failed to fetch costs' });
    }
});

module.exports = router;
