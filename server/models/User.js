/**
 * User Model - Application-level authentication
 * 
 * Separate from email sending accounts.
 * Used for: Login, permissions, owning leads/campaigns.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    // Login credentials
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        select: false  // Don't return password by default
    },

    // OAuth IDs (for social login) - index: true creates the index
    googleId: { type: String, sparse: true, index: true },
    githubId: { type: String, sparse: true, index: true },

    // Profile
    name: { type: String },
    picture: { type: String },

    // Account status
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },

    // Application Settings
    settings: {
        openai_key: { type: String }, // Encrypted
        gemini_key: { type: String }, // Encrypted
        openai_model: { type: String, default: 'gpt-4o-mini' }, // gpt-4o, gpt-4-turbo, etc.
        preferred_model: { type: String, enum: ['gemini', 'openai', 'huggingface'], default: 'gemini' }
    },

    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    lastLoginAt: { type: Date }
});

// Hash password before saving (Mongoose 6+ - don't use next() with async)
UserSchema.pre('save', async function () {
    this.updatedAt = new Date();

    if (!this.isModified('password') || !this.password) {
        return;
    }

    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
};

// Get public profile (safe to send to client)
UserSchema.methods.toPublicJSON = function () {
    return {
        id: this._id,
        email: this.email,
        name: this.name,
        picture: this.picture,
        createdAt: this.createdAt
    };
};

module.exports = mongoose.model('User', UserSchema);
