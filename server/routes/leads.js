const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const logger = require('../logger');

// GET all leads (with optional filtering)
router.get('/', async (req, res) => {
    try {
        const { status } = req.query;
        const query = status ? { status } : {};

        // Sort by newest first
        const leads = await Lead.find(query).sort({ createdAt: -1 }).limit(100);
        res.json(leads);
    } catch (error) {
        logger.error(`Error fetching leads: ${error.message}`);
        res.status(500).json({ error: 'Server Error' });
    }
});

// POST create a manual lead
router.post('/', async (req, res) => {
    try {
        const newLead = new Lead(req.body);
        const savedLead = await newLead.save();
        logger.info(`Manual lead created: ${savedLead.company_name}`);
        res.status(201).json(savedLead);
    } catch (error) {
        logger.error(`Error creating lead: ${error.message}`);
        res.status(400).json({ error: 'Invalid Lead Data' });
    }
});

// PUT update lead status or data
router.put('/:id', async (req, res) => {
    try {
        const updatedLead = await Lead.findByIdAndUpdate(
            req.params.id,
            { $set: req.body, updatedAt: Date.now() },
            { new: true }
        );
        if (!updatedLead) return res.status(404).json({ error: 'Lead not found' });

        logger.info(`Lead updated: ${updatedLead.company_name}`);
        res.json(updatedLead);
    } catch (error) {
        logger.error(`Error updating lead: ${error.message}`);
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;
