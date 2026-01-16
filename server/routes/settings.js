const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const crypto = require('../utils/crypto');
const logger = require('../logger');

// Get User Settings
router.get('/', requireAuth, async (req, res) => {
    console.log('[DEBUG] Settings Route Hit. req.userId:', req.userId);
    try {
        // Fix: Use req.userId set by middleware
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Return settings (masking keys)
        res.json({
            settings: {
                preferred_model: user.settings?.preferred_model || 'gemini',
                openai_model: user.settings?.openai_model || 'gpt-4o-mini',
                has_openai_key: !!user.settings?.openai_key,
                has_gemini_key: !!user.settings?.gemini_key
            }
        });
    } catch (err) {
        logger.error(`Get Settings Error: ${err.message}`);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// Update User Settings
router.put('/', requireAuth, async (req, res) => {
    const { openai_key, gemini_key, preferred_model } = req.body;

    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Initialize settings if user doesn't have it (for legacy records)
        if (!user.settings) {
            user.settings = {};
        }

        // Update preferred model
        if (preferred_model && ['gemini', 'openai'].includes(preferred_model)) {
            user.settings.preferred_model = preferred_model;
        }

        // Handle Keys - only update if provided (allows partial updates)
        let newOpenAIKeyProvided = false;
        if (openai_key) {
            user.settings.openai_key = crypto.encrypt(openai_key);
            newOpenAIKeyProvided = true;
        } else if (openai_key === "") {
            // Handle explicit removal if sent as empty string
            user.settings.openai_key = undefined;
        }

        if (gemini_key) {
            user.settings.gemini_key = crypto.encrypt(gemini_key);
        } else if (gemini_key === "") {
            user.settings.gemini_key = undefined;
        }

        // Handle OpenAI Model Selection (Strict Validation)
        const openai_model = req.body.openai_model;
        if (openai_model) {
            const hasKey = !!user.settings.openai_key || newOpenAIKeyProvided;

            if (hasKey) {
                // If user has a key, allow them to choose the model
                user.settings.openai_model = openai_model;
            } else {
                // No key? You get the cheap default.
                logger.warn(`User ${req.userId} tried to set premium model ${openai_model} without API key. Resetting to gpt-4o-mini.`);
                user.settings.openai_model = 'gpt-4o-mini';
            }
        }

        await user.save();

        res.json({
            success: true,
            settings: {
                preferred_model: user.settings.preferred_model,
                openai_model: user.settings.openai_model || 'gpt-4o-mini',
                has_openai_key: !!user.settings.openai_key,
                has_gemini_key: !!user.settings.gemini_key
            }
        });
    } catch (err) {
        logger.error(`Update Settings Error: ${err.message}`);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

module.exports = router;
