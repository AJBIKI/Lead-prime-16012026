/**
 * Gmail OAuth Service - Send emails via user's Gmail using OAuth 2.0
 * 
 * Flow:
 * 1. User clicks "Connect Gmail" → redirected to Google consent page
 * 2. User authorizes → Google redirects back with auth code
 * 3. We exchange code for access_token + refresh_token
 * 4. Store tokens in database
 * 5. Use tokens to send emails via Gmail API
 */

const { google } = require('googleapis');
const logger = require('../logger');

// Gmail API scopes
const SCOPES = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
];

class GmailOAuthService {
    constructor() {
        // OAuth client will be initialized lazily
        this._oauth2Client = null;
    }

    // Lazy initialization to ensure env vars are loaded
    get oauth2Client() {
        if (!this._oauth2Client) {
            this._oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback'
            );
        }
        return this._oauth2Client;
    }

    /**
     * Generate OAuth authorization URL
     * @param {string} userId - Optional userId to pass through state
     * @returns {string} URL to redirect user to
     */
    getAuthUrl(userId = null) {
        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline', // Get refresh token
            scope: SCOPES,
            prompt: 'consent', // Always show consent to get refresh token
            state: userId || 'null' // Pass userId through OAuth flow
        });
    }

    /**
     * Exchange authorization code for tokens
     * @param {string} code - Authorization code from Google callback
     * @returns {Object} tokens { access_token, refresh_token, expiry_date }
     */
    async getTokensFromCode(code) {
        const { tokens } = await this.oauth2Client.getToken(code);
        return tokens;
    }

    /**
     * Get user info from Google
     * @param {Object} tokens - OAuth tokens
     * @returns {Object} { email, name, picture }
     */
    async getUserInfo(tokens) {
        this.oauth2Client.setCredentials(tokens);
        const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
        const { data } = await oauth2.userinfo.get();
        return {
            email: data.email,
            name: data.name,
            picture: data.picture
        };
    }

    /**
     * Send email via Gmail API
     * @param {Object} tokens - User's OAuth tokens
     * @param {Object} email - { to, subject, body, from_name }
     * @returns {Object} { success, messageId, error }
     */
    async sendEmail(tokens, email) {
        try {
            this.oauth2Client.setCredentials(tokens);
            const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

            // Get user's email address for "from" field
            const userInfo = await this.getUserInfo(tokens);
            const fromEmail = userInfo.email;
            const fromName = email.from_name || userInfo.name || fromEmail;

            // Create email in RFC 2822 format
            const emailContent = [
                `From: ${fromName} <${fromEmail}>`,
                `To: ${email.to}`,
                `Subject: ${email.subject}`,
                'MIME-Version: 1.0',
                'Content-Type: text/html; charset=utf-8',
                '',
                email.body.replace(/\n/g, '<br>')
            ].join('\r\n');

            // Base64 encode with URL-safe characters
            const encodedEmail = Buffer.from(emailContent)
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            // Send via Gmail API
            const response = await gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: encodedEmail
                }
            });

            logger.info(`✓ Email sent via Gmail API (ID: ${response.data.id})`);

            return {
                success: true,
                provider: 'gmail_oauth',
                messageId: response.data.id,
                threadId: response.data.threadId,
                from: fromEmail
            };
        } catch (error) {
            logger.error(`Gmail API error: ${error.message}`);

            // Check if token expired
            if (error.code === 401) {
                return {
                    success: false,
                    error: 'Gmail authorization expired. Please reconnect your Gmail account.',
                    needsReauth: true
                };
            }

            return {
                success: false,
                error: error.message,
                provider: 'gmail_oauth'
            };
        }
    }

    /**
     * Refresh expired access token
     * @param {Object} tokens - Old tokens with refresh_token
     * @returns {Object} New tokens
     */
    async refreshTokens(tokens) {
        if (!tokens.refresh_token) {
            throw new Error('No refresh token available');
        }

        this.oauth2Client.setCredentials(tokens);
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        return credentials;
    }

    /**
     * Revoke user's tokens (disconnect)
     * @param {string} token - Access token to revoke
     */
    async revokeToken(token) {
        await this.oauth2Client.revokeToken(token);
    }
}

module.exports = new GmailOAuthService();
