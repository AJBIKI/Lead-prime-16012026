const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema({
    // Owner references
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    campaignId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign',
        index: true
    },

    // Company info
    company_name: { type: String, required: true },
    website: { type: String },
    context: { type: String }, // Why it matches ICP

    // Phase 2: LLM-Extracted Research Data
    company_summary: { type: String },
    value_proposition: { type: String },
    target_customers: [String],
    pain_points: [String],
    recent_news: [String],

    // Research Data (Deep Dive)
    summary: { type: String }, // Legacy field
    technologies: [String],
    key_personnel: [String],

    // LLM Metadata
    extraction_tokens: { type: Number },
    extraction_cost: { type: Number },
    llm_provider: { type: String },

    // Metadata
    status: { type: String, enum: ['new', 'researching', 'contacted', 'qualified', 'disqualified'], default: 'new' },
    source: { type: String, default: 'ai_prospector' },
    confidence_score: { type: Number, default: 0 },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },

    // Phase 2.5: Email Generation
    email_subject: { type: String },
    email_body: { type: String },
    email_template_id: { type: String },
    email_template_category: { type: String },
    email_generation_cost: { type: Number },
    email_generation_tokens: { type: Number },
    email_llm_provider: { type: String },
    email_sent: { type: Boolean, default: false },
    email_sent_at: { type: Date },
    email_sent_provider: { type: String }, // gmail_oauth, sendgrid, smtp
    email_message_id: { type: String },    // For tracking
    email_opened: { type: Boolean, default: false },
    email_replied: { type: Boolean, default: false },

    // Sender Information (which email account sent this)
    senderEmail: { type: String },

    // Contact/Recipient Information
    contact_email: { type: String },
    contact_name: { type: String }
});

// Compound index for efficient user queries
LeadSchema.index({ userId: 1, campaignId: 1 });
LeadSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Lead', LeadSchema);
