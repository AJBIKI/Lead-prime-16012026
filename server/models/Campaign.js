/**
 * Campaign Model - Groups leads by search/ICP
 * 
 * Each time a user runs a search, a campaign is created.
 * Leads are linked to campaigns for filtering.
 */

const mongoose = require('mongoose');

const CampaignSchema = new mongoose.Schema({
    // Owner
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Campaign info
    name: { type: String, required: true },
    icp: { type: String, required: true },  // Original search query

    // Status
    status: {
        type: String,
        enum: ['running', 'completed', 'failed', 'cancelled'],
        default: 'running'
    },

    // Stats
    lead_count: { type: Number, default: 0 },
    emails_generated: { type: Number, default: 0 },
    emails_sent: { type: Number, default: 0 },

    // Cost tracking
    total_cost: { type: Number, default: 0 },

    // Timestamps
    createdAt: { type: Date, default: Date.now },
    completedAt: { type: Date }
});

// Compound index for efficient user queries
CampaignSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Campaign', CampaignSchema);
