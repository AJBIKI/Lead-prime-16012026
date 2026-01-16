/**
 * Email Sender Service - Waterfall Strategy
 * Primary: SendGrid → Fallback: Gmail SMTP
 * 
 * SaaS Model: Users configure their own email credentials
 */

const nodemailer = require('nodemailer');
const logger = require('../logger');

class EmailSender {
    constructor(userConfig = {}) {
        /**
         * userConfig: {
         *   sendgrid_api_key: string (optional),
         *   smtp_host: string (optional, e.g., 'smtp.gmail.com'),
         *   smtp_port: number (optional, e.g., 587),
         *   smtp_user: string (optional, user's email),
         *   smtp_pass: string (optional, app password),
         *   from_email: string (required),
         *   from_name: string (optional)
         * }
         */
        this.config = userConfig;
        this.sendgridClient = null;
        this.smtpTransport = null;

        this._initProviders();
    }

    _initProviders() {
        // Initialize SendGrid if API key provided
        if (this.config.sendgrid_api_key) {
            try {
                const sgMail = require('@sendgrid/mail');
                sgMail.setApiKey(this.config.sendgrid_api_key);
                this.sendgridClient = sgMail;
                logger.info('SendGrid initialized for email sending');
            } catch (error) {
                logger.warn('SendGrid initialization failed:', error.message);
            }
        }

        // Initialize SMTP if credentials provided
        if (this.config.smtp_user && this.config.smtp_pass) {
            try {
                this.smtpTransport = nodemailer.createTransport({
                    host: this.config.smtp_host || 'smtp.gmail.com',
                    port: this.config.smtp_port || 587,
                    secure: false, // TLS
                    auth: {
                        user: this.config.smtp_user,
                        pass: this.config.smtp_pass
                    }
                });
                logger.info('SMTP transport initialized for email sending');
            } catch (error) {
                logger.warn('SMTP initialization failed:', error.message);
            }
        }
    }

    /**
     * Send email using waterfall strategy
     * @param {Object} email - { to, subject, body, html (optional) }
     * @returns {Object} - { success, provider, messageId, error }
     */
    async send(email) {
        const { to, subject, body, html } = email;

        if (!to || !subject || !body) {
            return { success: false, error: 'Missing required fields: to, subject, body' };
        }

        const from = this.config.from_name
            ? `${this.config.from_name} <${this.config.from_email}>`
            : this.config.from_email;

        // Waterfall: Try SendGrid first
        if (this.sendgridClient) {
            const result = await this._sendViaSendGrid({ to, from, subject, body, html });
            if (result.success) {
                return result;
            }
            logger.warn('SendGrid failed, falling back to SMTP:', result.error);
        }

        // Fallback: Try SMTP
        if (this.smtpTransport) {
            const result = await this._sendViaSMTP({ to, from, subject, body, html });
            if (result.success) {
                return result;
            }
            logger.error('SMTP also failed:', result.error);
        }

        // No providers available or all failed
        return {
            success: false,
            error: 'All email providers failed. Please check your email configuration.',
            provider: 'none'
        };
    }

    async _sendViaSendGrid({ to, from, subject, body, html }) {
        try {
            const msg = {
                to,
                from,
                subject,
                text: body,
                html: html || body.replace(/\n/g, '<br>')
            };

            const response = await this.sendgridClient.send(msg);

            return {
                success: true,
                provider: 'sendgrid',
                messageId: response[0]?.headers?.['x-message-id'] || 'unknown',
                statusCode: response[0]?.statusCode
            };
        } catch (error) {
            return {
                success: false,
                provider: 'sendgrid',
                error: error.message
            };
        }
    }

    async _sendViaSMTP({ to, from, subject, body, html }) {
        try {
            const info = await this.smtpTransport.sendMail({
                from,
                to,
                subject,
                text: body,
                html: html || body.replace(/\n/g, '<br>')
            });

            return {
                success: true,
                provider: 'smtp',
                messageId: info.messageId,
                response: info.response
            };
        } catch (error) {
            return {
                success: false,
                provider: 'smtp',
                error: error.message
            };
        }
    }

    /**
     * Verify email configuration by sending a test email
     */
    async verifyConfiguration(testEmail) {
        return this.send({
            to: testEmail,
            subject: 'Revenue Engine - Email Configuration Test',
            body: 'This is a test email to verify your email configuration is working correctly.\n\nIf you received this, your setup is complete! ✅'
        });
    }

    /**
     * Get available providers status
     */
    getProviderStatus() {
        return {
            sendgrid: !!this.sendgridClient,
            smtp: !!this.smtpTransport,
            from_email: this.config.from_email || 'Not configured'
        };
    }
}

/**
 * Create email sender with platform default config (for demo/testing)
 * In production, each user would have their own config
 */
function createDefaultSender() {
    return new EmailSender({
        // Platform defaults from environment (for testing)
        sendgrid_api_key: process.env.SENDGRID_API_KEY,
        smtp_host: process.env.SMTP_HOST || 'smtp.gmail.com',
        smtp_port: parseInt(process.env.SMTP_PORT) || 587,
        smtp_user: process.env.SMTP_USER,
        smtp_pass: process.env.SMTP_PASS,
        from_email: process.env.FROM_EMAIL || 'noreply@example.com',
        from_name: process.env.FROM_NAME || 'Revenue Engine'
    });
}

module.exports = { EmailSender, createDefaultSender };
