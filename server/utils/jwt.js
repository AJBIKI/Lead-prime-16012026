/**
 * JWT Utilities - Token generation and verification
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';  // 7 days for simplicity
const JWT_COOKIE_NAME = 'auth_token';

/**
 * Generate JWT token for a user
 * @param {Object} user - User object with _id
 * @returns {string} JWT token
 */
function generateToken(user) {
    return jwt.sign(
        {
            userId: user._id.toString(),
            email: user.email
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

/**
 * Set auth cookie on response
 * @param {Response} res - Express response object
 * @param {string} token - JWT token
 */
function setAuthCookie(res, token) {
    res.cookie(JWT_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
}

/**
 * Clear auth cookie
 * @param {Response} res - Express response object
 */
function clearAuthCookie(res) {
    res.clearCookie(JWT_COOKIE_NAME);
}

/**
 * Get token from cookie or header
 * @param {Request} req - Express request object
 * @returns {string|null} JWT token
 */
function getTokenFromRequest(req) {
    // Try cookie first
    if (req.cookies && req.cookies[JWT_COOKIE_NAME]) {
        return req.cookies[JWT_COOKIE_NAME];
    }

    // Try Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }

    return null;
}

module.exports = {
    generateToken,
    verifyToken,
    setAuthCookie,
    clearAuthCookie,
    getTokenFromRequest,
    JWT_COOKIE_NAME
};
