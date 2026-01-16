/**
 * Application Auth Routes - User login/signup with Google OAuth
 * 
 * Separate from email account connection (auth.js).
 * This handles user authentication for the application itself.
 */

const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const User = require('../models/User');
const { generateToken, setAuthCookie, clearAuthCookie } = require('../utils/jwt');
const { requireAuth } = require('../middleware/auth');
const logger = require('../logger');

// Google OAuth client for APP LOGIN (different from email sending)
const APP_OAUTH_SCOPES = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
];

function getOAuth2Client() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_APP_REDIRECT_URI || 'http://localhost:5000/api/app-auth/google/callback'
    );
}

/**
 * POST /api/app-auth/dev-login
 * Developer login for local testing (bypasses Google)
 */
router.post('/dev-login', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Dev login disabled in production' });
    }

    try {
        const email = 'dev@test.com';
        let user = await User.findOne({ email });

        if (!user) {
            user = new User({
                email,
                name: 'Test User',
                picture: 'https://github.com/shadcn.png', // Placeholder
                isVerified: true,
                settings: {
                    preferred_model: 'gemini'
                }
            });
            await user.save();
        }

        const token = generateToken(user);
        setAuthCookie(res, token);

        logger.info(`Dev user logged in: ${user.email}`);
        res.json({ success: true, user: user.toPublicJSON() });

    } catch (err) {
        logger.error(`Dev login error: ${err.message}`);
        res.status(500).json({ error: 'Dev login failed' });
    }
});

/**
 * GET /api/app-auth/google
 * Redirect to Google OAuth for app login
 */
router.get('/google', (req, res) => {
    const oauth2Client = getOAuth2Client();

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: APP_OAUTH_SCOPES,
        prompt: 'consent',
        state: 'app_login' // Distinguish from email connect
    });

    logger.info('Redirecting to Google OAuth for app login...');
    res.redirect(authUrl);
});

/**
 * GET /api/app-auth/google/callback
 * Handle Google OAuth callback for app login
 */
router.get('/google/callback', async (req, res) => {
    const { code, error } = req.query;

    if (error) {
        logger.error(`App OAuth error: ${error}`);
        return res.redirect('http://localhost:3000/login?error=' + error);
    }

    if (!code) {
        return res.redirect('http://localhost:3000/login?error=no_code');
    }

    try {
        const oauth2Client = getOAuth2Client();

        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Get user info
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const { data: googleUser } = await oauth2.userinfo.get();

        // Find or create user
        let user = await User.findOne({
            $or: [
                { googleId: googleUser.id },
                { email: googleUser.email.toLowerCase() }
            ]
        });

        if (!user) {
            // Create new user
            user = new User({
                email: googleUser.email.toLowerCase(),
                name: googleUser.name,
                picture: googleUser.picture,
                googleId: googleUser.id,
                isVerified: true // Google users are verified
            });
            await user.save();
            logger.info(`New user created via Google: ${user.email}`);
        } else {
            // Update existing user
            user.googleId = googleUser.id;
            user.name = user.name || googleUser.name;
            user.picture = user.picture || googleUser.picture;
            user.lastLoginAt = new Date();
            await user.save();
            logger.info(`User logged in via Google: ${user.email}`);
        }

        // Generate JWT and set cookie
        const token = generateToken(user);
        setAuthCookie(res, token);

        // Redirect to frontend
        res.redirect('http://localhost:3000?login=success');
    } catch (err) {
        logger.error(`App OAuth callback error: ${err.message}`);
        res.redirect('http://localhost:3000/login?error=' + encodeURIComponent(err.message));
    }
});

/**
 * GET /api/app-auth/me
 * Get current authenticated user
 */
router.get('/me', requireAuth, (req, res) => {
    res.json({
        user: req.user.toPublicJSON()
    });
});

/**
 * POST /api/app-auth/logout
 * Log out current user
 */
router.post('/logout', (req, res) => {
    clearAuthCookie(res);
    res.json({ success: true, message: 'Logged out' });
});

/**
 * GET /api/app-auth/status
 * Check if user is logged in (no auth required)
 */
router.get('/status', async (req, res) => {
    const { getTokenFromRequest, verifyToken } = require('../utils/jwt');

    try {
        const token = getTokenFromRequest(req);

        if (!token) {
            return res.json({ authenticated: false });
        }

        const decoded = verifyToken(token);
        if (!decoded) {
            return res.json({ authenticated: false });
        }

        const user = await User.findById(decoded.userId);
        if (!user || !user.isActive) {
            return res.json({ authenticated: false });
        }

        res.json({
            authenticated: true,
            user: user.toPublicJSON()
        });
    } catch (error) {
        res.json({ authenticated: false });
    }
});

module.exports = router;
