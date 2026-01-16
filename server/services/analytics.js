const Lead = require('../models/Lead');
const EmailAccount = require('../models/EmailAccount');
const Campaign = require('../models/Campaign');
const logger = require('../logger');

class AnalyticsService {
    /**
     * Get high-level dashboard stats
     * @param {string} userId 
     */
    async getOverviewStats(userId) {
        try {
            const totalLeads = await Lead.countDocuments({ userId });
            const totalCampaigns = await Campaign.countDocuments({ userId });

            // Email stats from leads
            const emailsGenerated = await Lead.countDocuments({
                userId,
                'email_draft.status': 'generated'
            });
            const emailsSent = await Lead.countDocuments({
                userId,
                'email_draft.status': 'sent'
            });

            // Calculate connected email accounts
            const connectedAccounts = await EmailAccount.countDocuments({
                userId,
                is_active: true
            });

            return {
                totalLeads,
                totalCampaigns,
                emailsGenerated,
                emailsSent,
                connectedAccounts,
                conversionRate: emailsSent > 0 ? ((emailsSent / totalLeads) * 100).toFixed(1) : 0
            };
        } catch (err) {
            logger.error(`Analytics Overview Error: ${err.message}`);
            throw err;
        }
    }

    /**
     * Get leads growth over time (last 7 days)
     * @param {string} userId 
     */
    async getLeadsTimeSeries(userId) {
        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const data = await Lead.aggregate([
                {
                    $match: {
                        userId,
                        createdAt: { $gte: sevenDaysAgo }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]);

            return data.map(item => ({ date: item._id, leads: item.count }));
        } catch (err) {
            logger.error(`Analytics Time Series Error: ${err.message}`);
            throw err;
        }
    }

    /**
     * Get estimated costs based on activity
     * Note: This is an estimation. Real tracking would require saving token usage per request.
     * @param {string} userId 
     */
    async getCostEstimation(userId) {
        // approximate costs
        const PER_SEARCH_COST = 0.01; // SerpAPI
        const PER_LEAD_ENRICHMENT_COST = 0.005; // LLM input/output
        const PER_EMAIL_GEN_COST = 0.002; // LLM generation

        const totalLeads = await Lead.countDocuments({ userId });
        const emailsGenerated = await Lead.countDocuments({ userId, 'email_draft.status': { $in: ['generated', 'sent'] } });
        const totalCampaigns = await Campaign.countDocuments({ userId });

        const searchCost = totalCampaigns * 0.10; // rough guess of 10 searches per campaign
        const enrichmentCost = totalLeads * PER_LEAD_ENRICHMENT_COST;
        const emailCost = emailsGenerated * PER_EMAIL_GEN_COST;

        return {
            total: (searchCost + enrichmentCost + emailCost).toFixed(4),
            breakdown: {
                search: searchCost.toFixed(4),
                enrichment: enrichmentCost.toFixed(4),
                emailGeneration: emailCost.toFixed(4)
            },
            currency: 'USD'
        };
    }
}

module.exports = new AnalyticsService();
