/**
 * Auth Middleware - Protect routes requiring authentication
 */

const User = require('../models/User');
const { verifyToken, getTokenFromRequest } = require('../utils/jwt');

/**
 * Require authentication middleware
 * Sets req.user if authenticated, returns 401 if not
 */
async function requireAuth(req, res, next) {
    try {
        const token = getTokenFromRequest(req);

        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const decoded = verifyToken(token);

        if (!decoded) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Get user from database
        const user = await User.findById(decoded.userId);

        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'User not found or inactive' });
        }

        // Attach user to request
        req.user = user;
        req.userId = user._id;

        console.log('[DEBUG] Auth Success:', {
            userId: req.userId,
            userEmail: user.email,
            idType: typeof req.userId
        });

        next();
    } catch (error) {
        console.error('Auth middleware error:', error.message);
        return res.status(401).json({ error: 'Authentication failed' });
    }
}

/**
 * Optional authentication middleware
 * Sets req.user if authenticated, but doesn't block if not
 */
async function optionalAuth(req, res, next) {
    try {
        const token = getTokenFromRequest(req);

        if (token) {
            const decoded = verifyToken(token);
            if (decoded) {
                const user = await User.findById(decoded.userId);
                if (user && user.isActive) {
                    req.user = user;
                    req.userId = user._id;
                }
            }
        }

        next();
    } catch (error) {
        // Silently continue without auth
        next();
    }
}

module.exports = {
    requireAuth,
    optionalAuth
};
