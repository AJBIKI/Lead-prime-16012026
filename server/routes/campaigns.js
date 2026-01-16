/**
 * Campaign Routes - Manage user's search campaigns
 */

const express = require('express');
const router = express.Router();
const Campaign = require('../models/Campaign');
const Lead = require('../models/Lead');
const { requireAuth } = require('../middleware/auth');
const logger = require('../logger');

// All routes require authentication
router.use(requireAuth);

/**
 * GET /api/campaigns
 * List user's campaigns (most recent first)
 */
router.get('/', async (req, res) => {
    try {
        const campaigns = await Campaign.find({ userId: req.userId })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        res.json({ campaigns });
    } catch (error) {
        logger.error('List campaigns error:', error.message);
        res.status(500).json({ error: 'Failed to list campaigns' });
    }
});

/**
 * GET /api/campaigns/:id
 * Get campaign details with lead count
 */
router.get('/:id', async (req, res) => {
    try {
        const campaign = await Campaign.findOne({
            _id: req.params.id,
            userId: req.userId
        }).lean();

        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        // Get lead stats
        const leadStats = await Lead.aggregate([
            { $match: { campaignId: campaign._id } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    emailsSent: { $sum: { $cond: ['$email_sent', 1, 0] } },
                    emailsGenerated: { $sum: { $cond: [{ $ne: ['$email_body', null] }, 1, 0] } }
                }
            }
        ]);

        res.json({
            campaign,
            stats: leadStats[0] || { total: 0, emailsSent: 0, emailsGenerated: 0 }
        });
    } catch (error) {
        logger.error('Get campaign error:', error.message);
        res.status(500).json({ error: 'Failed to get campaign' });
    }
});

/**
 * GET /api/campaigns/:id/leads
 * Get leads for a specific campaign
 */
router.get('/:id/leads', async (req, res) => {
    try {
        // Verify campaign belongs to user
        const campaign = await Campaign.findOne({
            _id: req.params.id,
            userId: req.userId
        });

        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        const leads = await Lead.find({ campaignId: req.params.id })
            .sort({ createdAt: -1 })
            .lean();

        res.json({ leads, campaign });
    } catch (error) {
        logger.error('Get campaign leads error:', error.message);
        res.status(500).json({ error: 'Failed to get leads' });
    }
});

/**
 * DELETE /api/campaigns/:id
 * Delete campaign and all its leads
 */
router.delete('/:id', async (req, res) => {
    try {
        const campaign = await Campaign.findOne({
            _id: req.params.id,
            userId: req.userId
        });

        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        // Delete all leads in this campaign
        await Lead.deleteMany({ campaignId: req.params.id });

        // Delete campaign
        await Campaign.deleteOne({ _id: req.params.id });

        logger.info(`Campaign deleted: ${campaign.name} (${campaign._id})`);

        res.json({ success: true });
    } catch (error) {
        logger.error('Delete campaign error:', error.message);
        res.status(500).json({ error: 'Failed to delete campaign' });
    }
});

/**
 * PATCH /api/campaigns/:id
 * Update campaign (name, status)
 */
router.patch('/:id', async (req, res) => {
    try {
        const { name, status } = req.body;

        const campaign = await Campaign.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            {
                ...(name && { name }),
                ...(status && { status })
            },
            { new: true }
        );

        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        res.json({ campaign });
    } catch (error) {
        logger.error('Update campaign error:', error.message);
        res.status(500).json({ error: 'Failed to update campaign' });
    }
});

module.exports = router;
