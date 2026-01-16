/**
 * EmailAccount Model - Stores connected email accounts for sending
 * 
 * Separate from application auth (User login).
 * Purpose: Store OAuth tokens to send emails via user's Gmail.
 * Tokens are encrypted before storage.
 */

const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/crypto');

const EmailAccountSchema = new mongoose.Schema({
    // Owner
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Email address
    email: { type: String, required: true, lowercase: true },

    // Display info
    name: { type: String },
    picture: { type: String },

    // Provider
    provider: { type: String, default: 'gmail', enum: ['gmail', 'outlook', 'smtp'] },

    // OAuth Tokens (stored encrypted)
    tokens: {
        access_token: { type: String },  // Encrypted
        refresh_token: { type: String }, // Encrypted
        expiry_date: { type: Number },
        token_type: { type: String },
        scope: { type: String }
    },

    // Status
    is_active: { type: Boolean, default: true },

    // Metadata
    connected_at: { type: Date, default: Date.now },
    last_used_at: { type: Date },
    emails_sent_count: { type: Number, default: 0 }
});

// Compound index: user can have multiple email accounts
EmailAccountSchema.index({ userId: 1, email: 1 }, { unique: true });
EmailAccountSchema.index({ userId: 1, is_active: 1 });

// Encrypt tokens before saving (non-async, using next())
EmailAccountSchema.pre('save', function (next) {
    try {
        if (this.isModified('tokens.access_token') && this.tokens.access_token) {
            // Only encrypt if not already encrypted (check for : separator)
            if (!this.tokens.access_token.includes(':')) {
                this.tokens.access_token = encrypt(this.tokens.access_token);
            }
        }
        if (this.isModified('tokens.refresh_token') && this.tokens.refresh_token) {
            if (!this.tokens.refresh_token.includes(':')) {
                this.tokens.refresh_token = encrypt(this.tokens.refresh_token);
            }
        }
        next();
    } catch (err) {
        console.error('Token encryption error:', err.message);
        next(err);
    }
});

// Method to get decrypted tokens (with error handling)
EmailAccountSchema.methods.getDecryptedTokens = function () {
    try {
        return {
            access_token: this.tokens.access_token ? decrypt(this.tokens.access_token) : null,
            refresh_token: this.tokens.refresh_token ? decrypt(this.tokens.refresh_token) : null,
            expiry_date: this.tokens.expiry_date,
            token_type: this.tokens.token_type,
            scope: this.tokens.scope
        };
    } catch (err) {
        console.error('Token decryption error:', err.message);
        // Return raw tokens if decryption fails (might be unencrypted)
        return {
            access_token: this.tokens.access_token,
            refresh_token: this.tokens.refresh_token,
            expiry_date: this.tokens.expiry_date,
            token_type: this.tokens.token_type,
            scope: this.tokens.scope
        };
    }
};

module.exports = mongoose.model('EmailAccount', EmailAccountSchema);
