const express = require('express');
const router = express.Router();
const axios = require('axios');
const Lead = require('../models/Lead');
const logger = require('../logger');

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';

/**
 * POST /api/emails/generate
 * Generate personalized email for a lead
 */
router.post('/generate', async (req, res) => {
    try {
        const { leadId, userContext } = req.body;

        if (!leadId) {
            return res.status(400).json({ error: 'leadId is required' });
        }

        // Get lead from database
        const lead = await Lead.findById(leadId);
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        // Prepare lead dossier for email generation
        const leadDossier = {
            company_name: lead.company_name,
            company_summary: lead.company_summary || lead.summary,
            value_proposition: lead.value_proposition,
            target_customers: lead.target_customers || [],
            technologies: lead.technologies || [],
            pain_points: lead.pain_points || [],
            recent_news: lead.recent_news || []
        };

        // Default user context if not provided
        const defaultUserContext = {
            sender_name: userContext?.sender_name || 'John Doe',
            company: userContext?.company || 'AI Solutions Inc',
            solution: userContext?.solution || 'our platform',
            website: userContext?.website || 'example.com'
        };

        logger.info(`Generating email for lead: ${lead.company_name}`);

        // Call AI Engine email generation endpoint
        const response = await axios.post(`${AI_ENGINE_URL}/generate-email`, {
            lead_dossier: leadDossier,
            user_context: defaultUserContext,
            template_category: req.body.template_category || null
        }, {
            timeout: 30000 // 30 second timeout
        });

        const emailData = response.data;

        // Update lead with generated email
        lead.email_subject = emailData.subject;
        lead.email_body = emailData.body;
        lead.email_template_id = emailData.template_id;
        lead.email_template_category = emailData.template_category;
        lead.email_generation_cost = emailData.cost;
        lead.email_generation_tokens = emailData.tokens;
        lead.email_llm_provider = emailData.llm_provider;

        await lead.save();

        logger.info(`✓ Email generated for ${lead.company_name} using ${emailData.llm_provider} ($${emailData.cost.toFixed(5)})`);

        res.json({
            success: true,
            email: {
                subject: emailData.subject,
                body: emailData.body,
                template_id: emailData.template_id,
                template_category: emailData.template_category,
                template_match_score: emailData.template_match_score,
                cost: emailData.cost,
                tokens: emailData.tokens,
                llm_provider: emailData.llm_provider
            },
            leadId: lead._id
        });

    } catch (error) {
        logger.error('Email generation error:', error.message);

        if (error.response) {
            // AI Engine returned an error
            return res.status(500).json({
                error: 'Email generation failed',
                details: error.response.data
            });
        }

        res.status(500).json({
            error: 'Email generation failed',
            details: error.message
        });
    }
});

/**
 * GET /api/emails/:leadId
 * Get generated email for a lead
 */
router.get('/:leadId', async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.leadId);

        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        if (!lead.email_subject) {
            return res.status(404).json({ error: 'No email generated for this lead' });
        }

        res.json({
            subject: lead.email_subject,
            body: lead.email_body,
            template_id: lead.email_template_id,
            template_category: lead.email_template_category,
            cost: lead.email_generation_cost,
            tokens: lead.email_generation_tokens,
            llm_provider: lead.email_llm_provider,
            sent: lead.email_sent,
            sent_at: lead.email_sent_at,
            opened: lead.email_opened,
            replied: lead.email_replied
        });

    } catch (error) {
        logger.error('Get email error:', error.message);
        res.status(500).json({ error: 'Failed to retrieve email' });
    }
});

/**
 * POST /api/emails/:leadId/mark-sent
 * Mark email as sent
 */
router.post('/:leadId/mark-sent', async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.leadId);

        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        lead.email_sent = true;
        lead.email_sent_at = new Date();
        await lead.save();

        logger.info(`Email marked as sent for ${lead.company_name}`);

        res.json({ success: true, sent_at: lead.email_sent_at });

    } catch (error) {
        logger.error('Mark sent error:', error.message);
        res.status(500).json({ error: 'Failed to mark email as sent' });
    }
});
/**
 * POST /api/emails/:leadId/send
 * Actually send the email via SendGrid or SMTP (waterfall)
 */
router.post('/:leadId/send', async (req, res) => {
    try {
        const { emailConfig, recipientEmail, editedSubject, editedBody } = req.body;
        const lead = await Lead.findById(req.params.leadId);

        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        // Use edited content if provided, otherwise use original from database
        const emailSubject = editedSubject || lead.email_subject;
        const emailBody = editedBody || lead.email_body;

        if (!emailSubject || !emailBody) {
            return res.status(400).json({ error: 'No email generated for this lead. Generate email first.' });
        }

        // Get recipient email (from request or lead data)
        const toEmail = recipientEmail || lead.contact_email;
        if (!toEmail) {
            return res.status(400).json({ error: 'No recipient email provided. Pass recipientEmail in request body.' });
        }

        logger.info(`Sending email to ${toEmail} for lead: ${lead.company_name}`);

        // Waterfall email sending: Gmail OAuth → SendGrid → SMTP
        let result;

        // 1. Try Gmail OAuth first (if user has connected account)
        const authRoutes = require('./auth');
        const gmailOAuth = require('../services/gmail_oauth');
        let connectedAccount = null;

        try {
            connectedAccount = await authRoutes.getFirstConnectedAccount(lead.userId);
        } catch (err) {
            logger.error(`Error getting connected account: ${err.message}`);
        }

        if (connectedAccount) {
            logger.info(`Attempting Gmail OAuth send via ${connectedAccount.email}`);
            try {
                result = await gmailOAuth.sendEmail(connectedAccount.tokens, {
                    to: toEmail,
                    subject: emailSubject,
                    body: emailBody
                });

                if (result.success) {
                    logger.info(`✓ Email sent via Gmail OAuth (${connectedAccount.email})`);
                } else if (result.needsReauth) {
                    logger.warn('Gmail token expired, falling back to other providers');
                } else {
                    logger.warn(`Gmail OAuth failed: ${result.error}, trying fallback`);
                }
            } catch (gmailErr) {
                logger.error(`Gmail OAuth send error: ${gmailErr.message}`);
                result = { success: false, error: gmailErr.message };
            }
        } else {
            logger.info('No Gmail OAuth account connected, using fallback');
        }

        // 2. Fallback to SendGrid/SMTP if Gmail OAuth not available or failed
        if (!result || !result.success) {
            const { EmailSender, createDefaultSender } = require('../services/email_sender');

            let sender;
            if (emailConfig && (emailConfig.sendgrid_api_key || emailConfig.smtp_user)) {
                sender = new EmailSender(emailConfig);
            } else {
                sender = createDefaultSender();
            }

            const status = sender.getProviderStatus();

            if (!connectedAccount && !status.sendgrid && !status.smtp) {
                return res.status(400).json({
                    error: 'No email provider configured.',
                    hint: 'Connect your Gmail account or configure SMTP/SendGrid in .env'
                });
            }

            if (status.sendgrid || status.smtp) {
                result = await sender.send({
                    to: toEmail,
                    subject: emailSubject,
                    body: emailBody
                });
            }
        }

        if (result.success) {
            // Update lead as sent
            lead.email_sent = true;
            lead.email_sent_at = new Date();
            lead.email_sent_provider = result.provider;
            lead.email_message_id = result.messageId;
            lead.senderEmail = result.from || (connectedAccount ? connectedAccount.email : null);
            await lead.save();

            // Increment sent count on the email account
            if (connectedAccount && result.provider === 'gmail_oauth') {
                await authRoutes.incrementSentCount(connectedAccount.email);
            }

            logger.info(`✓ Email sent to ${toEmail} via ${result.provider} from ${lead.senderEmail}`);

            return res.json({
                success: true,
                provider: result.provider,
                messageId: result.messageId,
                sent_at: lead.email_sent_at,
                from: lead.senderEmail
            });
        } else {
            logger.error(`Email send failed: ${result.error}`);
            return res.status(500).json({
                success: false,
                error: result.error,
                provider: result.provider
            });
        }

    } catch (error) {
        logger.error('Send email error:', error.message);
        res.status(500).json({ error: 'Failed to send email', details: error.message });
    }
});

module.exports = router;
