const express = require('express');
const axios = require('axios');
const logger = require('../logger');
const Lead = require('../models/Lead');
const Campaign = require('../models/Campaign');
const User = require('../models/User');
const crypto = require('../utils/crypto');
const { optionalAuth } = require('../middleware/auth');
const router = express.Router();

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';

/**
 * POST /api/agents/start-campaign
 * Start a new lead generation campaign
 * Creates a Campaign and links all leads to it
 */
router.post('/start-campaign', optionalAuth, async (req, res) => {
    const { icp, campaignName } = req.body;

    if (!icp) {
        return res.status(400).json({ error: 'ICP description is required' });
    }

    try {
        logger.info(`Starting campaign for ICP: ${icp}`);

        // Create campaign (if user is logged in)
        let campaign = null;
        if (req.userId) {
            campaign = new Campaign({
                userId: req.userId,
                name: campaignName || icp.substring(0, 50),
                icp: icp,
                status: 'running'
            });
            await campaign.save();
            logger.info(`Created campaign: ${campaign._id}`);
        }

        // Prepare config (API keys)
        let aiConfig = {};
        if (req.userId) {
            const user = await User.findById(req.userId);
            if (user && user.settings) {
                if (user.settings.openai_key) {
                    aiConfig.openai_key = crypto.decrypt(user.settings.openai_key);
                    logger.info(`[AI CONFIG] Using USER OpenAI Key for user ${req.userId}`);
                } else {
                    logger.info(`[AI CONFIG] No USER OpenAI Key. Will fallback to DEVELOPER key if OpenAI is selected.`);
                }
                if (user.settings.gemini_key) {
                    aiConfig.gemini_key = crypto.decrypt(user.settings.gemini_key);
                    logger.info(`[AI CONFIG] Using USER Gemini Key for user ${req.userId}`);
                } else {
                    logger.info(`[AI CONFIG] No USER Gemini Key. Will fallback to DEVELOPER key if Gemini is selected.`);
                }
                if (user.settings.preferred_model) {
                    aiConfig.preferred_model = user.settings.preferred_model;
                    logger.info(`[AI CONFIG] Preferred Provider: ${user.settings.preferred_model}`);
                }
                if (user.settings.openai_model) {
                    aiConfig.openai_model = user.settings.openai_model;
                    logger.info(`[AI CONFIG] OpenAI Model: ${user.settings.openai_model}`);
                }
            }
        } else {
            logger.info(`[AI CONFIG] Anonymous user - will use DEVELOPER keys for all providers`);
        }

        logger.info(`[AI CONFIG] Final config sent to AI Engine:`, JSON.stringify({
            preferred_model: aiConfig.preferred_model,
            openai_model: aiConfig.openai_model,
            has_user_openai_key: !!aiConfig.openai_key,
            has_user_gemini_key: !!aiConfig.gemini_key
        }));

        // Call the Python AI Engine
        const response = await axios.post(`${AI_ENGINE_URL}/prospect`, {
            icp,
            config: aiConfig
        });

        // Save generated leads to MongoDB with Phase 2 structured data
        let savedReports = [];
        if (response.data && response.data.data && response.data.data.reports) {
            const reports = response.data.data.reports;
            const savePromises = reports.map(report => {
                const deepDive = report.deep_dive || {};

                return Lead.findOneAndUpdate(
                    {
                        website: report.website,
                        ...(campaign && { campaignId: campaign._id }) // Scope by campaign if exists
                    },
                    {
                        // Owner references
                        userId: req.userId || null,
                        campaignId: campaign?._id || null,

                        // Company info
                        company_name: deepDive.company_name || report.company_name,
                        website: report.website,
                        context: report.context,

                        // Phase 2: Structured insights from LLM
                        company_summary: deepDive.company_summary,
                        value_proposition: deepDive.value_proposition,
                        target_customers: deepDive.target_customers || [],
                        technologies: deepDive.technologies || [],
                        pain_points: deepDive.pain_points || [],
                        recent_news: deepDive.recent_news || [],

                        // LLM metadata
                        extraction_tokens: deepDive.extraction_tokens,
                        extraction_cost: deepDive.extraction_cost,
                        llm_provider: deepDive.llm_provider,

                        // Legacy field
                        summary: deepDive.company_summary || deepDive.raw_content_preview || '',

                        status: 'researching',
                        source: 'ai_agent'
                    },
                    { upsert: true, new: true, lean: true }
                );
            });

            savedReports = (await Promise.all(savePromises)).map(doc => ({
                ...doc,
                deep_dive: doc,
                leadId: doc._id
            }));

            // Update campaign stats
            if (campaign) {
                campaign.lead_count = savedReports.length;
                campaign.status = 'completed';
                campaign.completedAt = new Date();
                await campaign.save();
            }

            logger.info(`Saved ${reports.length} leads to database with LLM-extracted insights.`);
        }

        // Return the data with database IDs
        res.json({
            ...response.data,
            campaignId: campaign?._id,
            data: {
                ...response.data.data,
                reports: savedReports
            }
        });
    } catch (error) {
        logger.error(`AI Engine Error: ${error.message}`);
        res.status(500).json({ error: 'Failed to start agent workflow' });
    }
});

module.exports = router;
