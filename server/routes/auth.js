/**
 * Auth Routes - Handle Email Account OAuth (Gmail, etc.)
 * 
 * NOTE: This is for connecting email accounts to SEND emails.
 *       Requires user to be logged in (app auth).
 */

const express = require('express');
const router = express.Router();
const gmailOAuth = require('../services/gmail_oauth');
const EmailAccount = require('../models/EmailAccount');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { getTokenFromRequest, verifyToken } = require('../utils/jwt');
const logger = require('../logger');

/**
 * GET /api/auth/google
 * Redirect user to Google OAuth consent page for email connection
 * Includes userId in state for callback
 */
router.get('/google', async (req, res) => {
    // Try to get userId from auth token
    let userId = null;
    const token = getTokenFromRequest(req);
    if (token) {
        const decoded = verifyToken(token);
        if (decoded) userId = decoded.userId;
    }

    // Generate auth URL with userId in state
    const authUrl = gmailOAuth.getAuthUrl(userId);
    logger.info('Redirecting to Google OAuth for email connection...');
    res.redirect(authUrl);
});

/**
 * GET /api/auth/google/callback
 * Handle OAuth callback from Google for email connection
 */
router.get('/google/callback', async (req, res) => {
    const { code, error, state } = req.query;

    if (error) {
        logger.error(`OAuth error: ${error}`);
        return res.redirect('http://localhost:3000?oauth_error=' + error);
    }

    if (!code) {
        return res.redirect('http://localhost:3000?oauth_error=no_code');
    }

    try {
        // Exchange code for tokens
        const tokens = await gmailOAuth.getTokensFromCode(code);

        // Get user info from Google
        const userInfo = await gmailOAuth.getUserInfo(tokens);

        // Get userId from state (passed from /google route)
        let userId = null;
        if (state && state !== 'null') {
            userId = state;
        }

        // If no userId in state, try to get from current session/cookie
        if (!userId) {
            const token = getTokenFromRequest(req);
            if (token) {
                const decoded = verifyToken(token);
                if (decoded) userId = decoded.userId;
            }
        }

        // Require userId for email account connection
        if (!userId) {
            logger.warn('Email account connection attempted without login');
            return res.redirect('http://localhost:3000?oauth_error=login_required');
        }

        // Save to EmailAccount collection (upsert per user+email)
        await EmailAccount.findOneAndUpdate(
            { userId: userId, email: userInfo.email.toLowerCase() },
            {
                userId: userId,
                email: userInfo.email.toLowerCase(),
                name: userInfo.name,
                picture: userInfo.picture,
                provider: 'gmail',
                tokens: {
                    access_token: tokens.access_token,
                    refresh_token: tokens.refresh_token,
                    expiry_date: tokens.expiry_date,
                    token_type: tokens.token_type,
                    scope: tokens.scope
                },
                is_active: true,
                connected_at: new Date()
            },
            { upsert: true, new: true }
        );

        logger.info(`✓ Email account connected for user ${userId}: ${userInfo.email}`);

        // Redirect to frontend with success
        res.redirect(`http://localhost:3000?oauth_success=true&email=${encodeURIComponent(userInfo.email)}`);
    } catch (err) {
        logger.error(`OAuth callback error: ${err.message}`);
        res.redirect('http://localhost:3000?oauth_error=' + encodeURIComponent(err.message));
    }
});

/**
 * GET /api/auth/email-accounts
 * Get user's connected email accounts
 */
router.get('/email-accounts', requireAuth, async (req, res) => {
    try {
        const accounts = await EmailAccount.find({ userId: req.userId, is_active: true })
            .select('email name picture provider connected_at emails_sent_count')
            .lean();

        res.json({
            connected: accounts.length > 0,
            count: accounts.length,
            accounts
        });
    } catch (err) {
        logger.error(`Get email accounts error: ${err.message}`);
        res.json({ connected: false, count: 0, accounts: [] });
    }
});

/**
 * POST /api/auth/email-accounts/disconnect
 * Disconnect an email account
 */
router.post('/email-accounts/disconnect', requireAuth, async (req, res) => {
    const { email } = req.body;

    try {
        const account = await EmailAccount.findOne({
            userId: req.userId,
            email: email.toLowerCase(),
            is_active: true
        });

        if (!account) {
            return res.status(400).json({ error: 'Email account not found' });
        }

        // Try to revoke tokens
        try {
            const tokens = account.getDecryptedTokens();
            if (tokens?.access_token) {
                await gmailOAuth.revokeToken(tokens.access_token);
            }
        } catch (err) {
            logger.warn(`Token revoke warning: ${err.message}`);
        }

        // Mark as inactive (soft delete)
        await EmailAccount.findOneAndUpdate(
            { _id: account._id },
            { is_active: false, tokens: null }
        );

        logger.info(`Email account disconnected: ${email}`);
        res.json({ success: true });
    } catch (err) {
        logger.error(`Disconnect error: ${err.message}`);
        res.status(500).json({ error: 'Failed to disconnect' });
    }
});

/**
 * Get first connected email account for current user (internal use)
 * If userId is null (legacy leads), tries to find ANY active account
 */
router.getFirstConnectedAccount = async (userId) => {
    let account;

    if (userId) {
        // Find account for specific user
        account = await EmailAccount.findOne({
            userId: userId,
            is_active: true
        });
    }

    // Fallback: if no userId or no account found, find ANY active account
    if (!account) {
        account = await EmailAccount.findOne({ is_active: true });
    }

    if (!account) return null;

    return {
        email: account.email,
        tokens: account.getDecryptedTokens(),
        provider: account.provider,
        userInfo: { email: account.email, name: account.name, picture: account.picture }
    };
};

/**
 * Increment emails sent count for an account
 */
router.incrementSentCount = async (email) => {
    await EmailAccount.findOneAndUpdate(
        { email: email.toLowerCase(), is_active: true },
        {
            $inc: { emails_sent_count: 1 },
            last_used_at: new Date()
        }
    );
};

module.exports = router;
